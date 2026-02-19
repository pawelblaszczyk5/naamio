import { Effect, Schema, SchemaGetter } from "effect";

import { generateId as generateIdPromise, verifyId as verifyIdPromise } from "#src/promise.js";

export const generateId = Effect.fn(function* () {
	return yield* Effect.promise(async () => generateIdPromise());
});

export const verifyId = Effect.fn(function* (id: string) {
	return yield* Effect.promise(async () => verifyIdPromise(id));
});

export const ValidId = Schema.String.check(Schema.isLengthBetween(16, 16)).pipe(
	Schema.decode({
		decode: SchemaGetter.checkEffect(
			Effect.fn(function* (value: string) {
				const valid = yield* verifyId(value);

				if (!valid) {
					return "Invalid ID";
				}

				return valid;
			}),
		),
		encode: SchemaGetter.passthrough(),
	}),
);
