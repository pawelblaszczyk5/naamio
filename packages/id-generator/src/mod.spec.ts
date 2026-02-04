import { describe, expect, it } from "@effect/vitest";
import { Effect, Either, Schema } from "effect";

import { generateId as generateIdEffect, ValidId, verifyId as verifyIdEffect } from "#src/effect.js";
import { generateId as generateIdPromise, verifyId as verifyIdPromise } from "#src/promise.js";

const EMPTY_ID = "";
const INVALID_LENGTH_ID = "2hWnfzvF7nNgpMS"; // cspell:disable-line
const INVALID_HASH_ID = "9aUQuGdqpu4sctVJ"; // cspell:disable-line

const EXAMPLE_VALID_IDS = ["7Vwi92bMsy4XRiTx", "FKi7iG6eWfwtJ6Ja", "HrrYm5PFTeQAhLC4"]; // cspell:disable-line

describe("Effect API", () => {
	it.effect(
		"Should properly work for generate -> verify flow",
		Effect.fn(function* () {
			yield* generateIdEffect().pipe(
				Effect.tap(
					Effect.fn(function* (id) {
						expect(id).toHaveLength(16);
					}),
				),
				Effect.andThen(
					Effect.fn(function* (id) {
						expect(yield* verifyIdEffect(id)).toBe(true);
					}),
				),
				Effect.repeat({ times: 50 }),
			);
		}),
	);

	it.effect(
		"Should properly reject invalid identifiers",
		Effect.fn(function* () {
			expect(yield* verifyIdEffect(EMPTY_ID)).toBe(false);
			expect(yield* verifyIdEffect(INVALID_LENGTH_ID)).toBe(false);
			expect(yield* verifyIdEffect(INVALID_HASH_ID)).toBe(false);
		}),
	);

	it.effect(
		"Should properly work for pregenerated examples",
		Effect.fn(function* () {
			yield* Effect.forEach(
				EXAMPLE_VALID_IDS,
				Effect.fn(function* (id) {
					expect(yield* verifyIdEffect(id)).toBe(true);
				}),
			);
		}),
	);

	it.effect(
		"Should properly work when composing exposed filter with custom schema",
		Effect.fn(function* () {
			const schema = Schema.compose(ValidId, Schema.String.pipe(Schema.brand("ExampleId"), Schema.length(16)));
			const decode = Schema.decode(schema);

			const isDecodingSuccessful = Effect.fn(function* (value: string) {
				const result = yield* decode(value).pipe(Effect.either);

				return Either.isRight(result);
			});

			expect(yield* isDecodingSuccessful(yield* generateIdEffect())).toBe(true);
			expect(yield* isDecodingSuccessful(EMPTY_ID)).toBe(false);
			expect(yield* isDecodingSuccessful(INVALID_HASH_ID)).toBe(false);
			expect(yield* isDecodingSuccessful(INVALID_LENGTH_ID)).toBe(false);
		}),
	);
});

describe("Promises API", () => {
	it("Should properly work for generate -> verify flow", async () => {
		for (let i = 0; i < 50; i += 1) {
			const id = await generateIdPromise();

			expect(id).toHaveLength(16);
			expect(await verifyIdPromise(id)).toBe(true);
		}
	});

	it("Should properly reject invalid identifiers", async () => {
		expect(await verifyIdPromise(EMPTY_ID)).toBe(false);
		expect(await verifyIdPromise(INVALID_LENGTH_ID)).toBe(false);
		expect(await verifyIdPromise(INVALID_HASH_ID)).toBe(false);
	});

	it("Should properly work for pregenerated examples", async () => {
		await Promise.all(
			EXAMPLE_VALID_IDS.map(async (id) => {
				expect(await verifyIdPromise(id)).toBe(true);
			}),
		);
	});
});
