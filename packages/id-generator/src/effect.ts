import { Effect, Schema } from "effect";

import { generateId as generateIdPromise, verifyId as verifyIdPromise } from "#src/promise.js";

export const generateId = Effect.fn(function* () {
	return yield* Effect.promise(async () => generateIdPromise());
});

export const verifyId = Effect.fn(function* (id: string) {
	return yield* Effect.promise(async () => verifyIdPromise(id));
});

export const validId = Schema.filterEffect(
	Schema.String.pipe(Schema.length(16)),
	Effect.fn(function* (value) {
		const valid = yield* verifyId(value);

		if (!valid) {
			return "Invalid ID";
		}

		return valid;
	}),
).annotations({ identifier: "ValidId" });
