import { Effect } from "effect";

import { generateId as generateIdPromise, verifyId as verifyIdPromise } from "#src/promise.js";

export const generateId = Effect.fn(function* () {
	return yield* Effect.promise(async () => generateIdPromise());
});

export const verifyId = Effect.fn(function* (id: string) {
	return yield* Effect.promise(async () => verifyIdPromise(id));
});
