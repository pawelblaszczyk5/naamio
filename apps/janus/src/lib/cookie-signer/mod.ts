import { Array, Effect, Encoding, Layer, Option, Redacted, Result, Schema, ServiceMap } from "effect";

import { generateHmacSignature, verifyHmacSignature } from "@naamio/hmac";

type SignedCookieSchema<T> = Schema.Codec<T, string>;

export class CookieSigner extends ServiceMap.Service<
	CookieSigner,
	{
		decode: <T>(
			cookie: string,
			schema: SignedCookieSchema<T>,
			secrets: Array.NonEmptyArray<Redacted.Redacted> | Redacted.Redacted,
		) => Effect.Effect<Option.Option<T>>;
		encode: <T>(
			schema: SignedCookieSchema<T>,
			value: NoInfer<T>,
			secrets: Array.NonEmptyArray<Redacted.Redacted> | Redacted.Redacted,
		) => Effect.Effect<string>;
	}
>()("@naamio/janus/CookieSigner") {
	static layer = Layer.effect(
		this,
		Effect.gen(function* () {
			return CookieSigner.of({
				decode: Effect.fn("@naamio/janus/CookieSigner#decode")(function* (cookie, schema, secrets) {
					const lastDotIndex = cookie.lastIndexOf(".");

					const base64Value = cookie.slice(0, lastDotIndex);
					const digest = Redacted.make(cookie.slice(lastDotIndex + 1));

					const allSecrets = Array.isArray(secrets) ? secrets : Array.make(secrets);

					const maybeMatchingSecret = Array.head(
						yield* Effect.filter(allSecrets, (secret) => verifyHmacSignature(base64Value, digest, secret)),
					);

					if (Option.isNone(maybeMatchingSecret)) {
						return Option.none();
					}

					const maybeStringifiedValue = Encoding.decodeBase64UrlString(base64Value);

					if (Result.isFailure(maybeStringifiedValue)) {
						return Option.none();
					}

					const value = Schema.decodeOption(schema)(maybeStringifiedValue.success);

					return value;
				}),
				encode: Effect.fn("@naamio/janus/CookieSigner#encode")(function* (schema, value, secrets) {
					const stringifiedValue = yield* Schema.encodeEffect(schema)(value).pipe(
						Effect.catchTag("SchemaError", Effect.die),
					);
					const base64Value = Encoding.encodeBase64Url(stringifiedValue);
					const secretToUse = Array.isArray(secrets) ? Array.lastNonEmpty(secrets) : secrets;

					const signature = yield* generateHmacSignature(base64Value, secretToUse);

					const valueWithSignature = `${base64Value}.${Redacted.value(signature)}`;

					return valueWithSignature;
				}),
			});
		}),
	) satisfies Layer.Layer<CookieSigner, unknown>;
}
