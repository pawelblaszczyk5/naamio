import { Array, Context, Effect, Either, Encoding, Layer, Option, Redacted, Schema } from "effect";

type SignedCookieSchema<T> = Schema.Schema<T, string>;

export class CookieSigner extends Context.Tag("@naamio/janus/CookieSigner")<
	CookieSigner,
	{
		decode: <T>(
			cookie: string,
			schema: SignedCookieSchema<T>,
			secrets: Array.NonEmptyArray<Redacted.Redacted> | Redacted.Redacted,
		) => Effect.Effect<Option.Option<T>>;
		encode: <T>(
			value: T,
			schema: SignedCookieSchema<NoInfer<T>>,
			secrets: Array.NonEmptyArray<Redacted.Redacted> | Redacted.Redacted,
		) => Effect.Effect<string>;
	}
>() {
	static Live = Layer.effect(
		this,
		Effect.gen(function* () {
			const encoder = new TextEncoder();

			const createKey = Effect.fn(function* (secret: Redacted.Redacted, usage: "sign" | "verify") {
				return yield* Effect.promise(async () =>
					crypto.subtle.importKey(
						"raw",
						encoder.encode(secret.pipe(Redacted.value)),
						{ hash: "SHA-512", name: "HMAC" },
						false,
						[usage],
					),
				);
			});

			const sign = Effect.fn(function* (value: string, secret: Redacted.Redacted) {
				const data = encoder.encode(value);
				const key = yield* createKey(secret, "sign");

				const signature = yield* Effect.promise(async () => crypto.subtle.sign("HMAC", key, data));

				const digest = Encoding.encodeBase64Url(new Uint8Array(signature));
				const valueWithSignature = `${value}.${digest}`;

				return valueWithSignature;
			});

			const verify = Effect.fn(function* (value: string, digest: string, secret: Redacted.Redacted) {
				const data = encoder.encode(value);
				const key = yield* createKey(secret, "verify");

				const maybeSignature = Encoding.decodeBase64Url(digest);

				if (Either.isLeft(maybeSignature)) {
					return false;
				}

				const valid = yield* Effect.promise(async () =>
					crypto.subtle.verify("HMAC", key, new Uint8Array(maybeSignature.right), data),
				);

				return valid;
			});

			return {
				decode: Effect.fn("@naamio/janus/CookieSigner/decode")(function* <T>(
					cookie: string,
					schema: SignedCookieSchema<T>,
					secrets: Array.NonEmptyArray<Redacted.Redacted> | Redacted.Redacted,
				) {
					const lastDotIndex = cookie.lastIndexOf(".");
					const base64Value = cookie.slice(0, lastDotIndex);
					const digest = cookie.slice(lastDotIndex + 1);

					const allSecrets = Array.isArray(secrets) ? secrets : Array.make(secrets);

					const maybeMatchingSecret = yield* Effect.findFirst(allSecrets, (secret) =>
						verify(base64Value, digest, secret),
					);

					if (Option.isNone(maybeMatchingSecret)) {
						return Option.none();
					}

					const maybeStringifiedValue = Encoding.decodeBase64UrlString(base64Value);

					if (Either.isLeft(maybeStringifiedValue)) {
						return Option.none();
					}

					const value = Schema.decodeOption(schema)(maybeStringifiedValue.right);

					return value;
				}),
				encode: Effect.fn("@naamio/janus/CookieSigner/encode")(function* <T>(
					value: T,
					schema: SignedCookieSchema<T>,
					secrets: Array.NonEmptyArray<Redacted.Redacted> | Redacted.Redacted,
				) {
					const stringifiedValue = yield* Schema.encode(schema)(value).pipe(Effect.orDie);
					const base64Value = Encoding.encodeBase64Url(stringifiedValue);
					const secretToUse = Array.isArray(secrets) ? Array.lastNonEmpty(secrets) : secrets;

					const cookie = yield* sign(base64Value, secretToUse);

					return cookie;
				}),
			} satisfies CookieSigner["Type"];
		}),
	);
}
