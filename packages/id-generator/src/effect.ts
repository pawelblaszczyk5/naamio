import { Effect, Schema, SchemaGetter } from "effect";

import { generateId as generateIdPromise, verifyId as verifyIdPromise } from "#src/promise.js";

export const generateId = Effect.fn(function* () {
	return yield* Effect.promise(async () => generateIdPromise());
});

export const verifyId = Effect.fn(function* (id: string) {
	return yield* Effect.promise(async () => verifyIdPromise(id));
});

export const VerifiedId = Schema.String.check(Schema.isLengthBetween(16, 16)).pipe(
	Schema.decode({
		decode: SchemaGetter.checkEffect(
			Effect.fn(function* (value: string) {
				const isValid = yield* verifyId(value);

				if (!isValid) {
					return "Invalid ID";
				}

				return isValid;
			}),
		),
		encode: SchemaGetter.passthrough(),
	}),
);
