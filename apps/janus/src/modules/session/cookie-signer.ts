import { Array, Context, Effect, Either, Encoding, Layer, Option, Redacted, Schema } from "effect";

import { generateHmacSignature, verifyHmacSignature } from "@naamio/hmac";

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
			return {
				decode: Effect.fn("@naamio/janus/CookieSigner#decode")(function* <T>(
					cookie: string,
					schema: SignedCookieSchema<T>,
					secrets: Array.NonEmptyArray<Redacted.Redacted> | Redacted.Redacted,
				) {
					const lastDotIndex = cookie.lastIndexOf(".");
					const base64Value = cookie.slice(0, lastDotIndex);
					const digest = Redacted.make(cookie.slice(lastDotIndex + 1));

					const allSecrets = Array.isArray(secrets) ? secrets : Array.make(secrets);

					const maybeMatchingSecret = yield* Effect.findFirst(allSecrets, (secret) =>
						verifyHmacSignature(base64Value, digest, secret),
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
				encode: Effect.fn("@naamio/janus/CookieSigner#encode")(function* <T>(
					value: T,
					schema: SignedCookieSchema<T>,
					secrets: Array.NonEmptyArray<Redacted.Redacted> | Redacted.Redacted,
				) {
					const stringifiedValue = yield* Schema.encode(schema)(value).pipe(Effect.orDie);
					const base64Value = Encoding.encodeBase64Url(stringifiedValue);
					const secretToUse = Array.isArray(secrets) ? Array.lastNonEmpty(secrets) : secrets;

					const signature = yield* generateHmacSignature(base64Value, secretToUse);

					const valueWithSignature = `${base64Value}.${Redacted.value(signature)}`;

					return valueWithSignature;
				}),
			} satisfies CookieSigner["Type"];
		}),
	);
}
