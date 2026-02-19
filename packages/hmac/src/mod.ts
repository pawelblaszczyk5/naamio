import { Effect, Redacted, Result } from "effect";
import { Base64Url } from "effect/encoding";

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

export const generateHmacSignature = Effect.fn(function* (value: string, secret: Redacted.Redacted) {
	const data = encoder.encode(value);
	const key = yield* createKey(secret, "sign");

	const signature = yield* Effect.promise(async () => crypto.subtle.sign("HMAC", key, data));

	const encodedSignature = Base64Url.encode(new Uint8Array(signature));

	return Redacted.make(encodedSignature);
});

export const verifyHmacSignature = Effect.fn(function* (
	value: string,
	signature: Redacted.Redacted,
	secret: Redacted.Redacted,
) {
	const data = encoder.encode(value);
	const key = yield* createKey(secret, "verify");

	const maybeSignature = Base64Url.decode(Redacted.value(signature));

	if (Result.isFailure(maybeSignature)) {
		return false;
	}

	const valid = yield* Effect.promise(async () =>
		crypto.subtle.verify("HMAC", key, new Uint8Array(maybeSignature.success), data),
	);

	return valid;
});
