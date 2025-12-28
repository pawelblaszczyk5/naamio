import { expect, it } from "@effect/vitest";
import { Effect, Redacted } from "effect";

import { generateHmacSignature, verifyHmacSignature } from "#src/mod.js";

const secret = Redacted.make("EXAMPLE_SUPER_SECURE_SECRET");

it.effect(
	"Should support basic back and forth flow",
	Effect.fn(function* () {
		const exampleData = "Hello World!";
		const signature = yield* generateHmacSignature(exampleData, secret);

		expect(Redacted.value(signature)).toMatchInlineSnapshot(
			// eslint-disable-next-line no-secrets/no-secrets -- encoded value it's expected, cspell:disable-next-line
			`"Dk5epBwnzSeUtv5gqL3PMjcboSXrIp31kd3O9yKfCiujxxE_qgrjfNNfxmFVmwgYT5AuL6opTudNtbr0Qp9YGw"`,
		);

		const isValid = yield* verifyHmacSignature(exampleData, signature, secret);

		expect(isValid).toBe(true);
	}),
);

it.effect(
	"Should reject different secret",
	Effect.fn(function* () {
		const exampleData = "Hello World!";
		const signature = yield* generateHmacSignature(exampleData, secret);

		const isValid = yield* verifyHmacSignature(
			exampleData,
			signature,
			Redacted.make("EXAMPLE_SUPER_SECURE_SECRET_BUT_DIFFERENT"),
		);

		expect(isValid).toBe(false);
	}),
);

it.effect(
	"Should reject different signature",
	Effect.fn(function* () {
		const exampleData = "Hello World!";
		const signature = yield* generateHmacSignature(exampleData, secret);

		const isValid = yield* verifyHmacSignature(
			exampleData,
			Redacted.make(`${Redacted.value(signature)}example`),
			secret,
		);

		expect(isValid).toBe(false);
	}),
);
