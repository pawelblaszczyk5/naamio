import { expect, it } from "@effect/vitest";
import { Array, Effect, Option, Redacted, Schema } from "effect";

import { CookieSigner } from "#src/lib/cookie-signer/mod.js";

const ExampleSchema = Schema.Struct({ bar: Schema.String, foo: Schema.Number });
const ExampleSchemaDifferent = Schema.Struct({ bar: Schema.String, foo: Schema.String });
const ExampleSchemaJson = Schema.parseJson(ExampleSchema);
const ExampleSchemaDifferentJson = Schema.parseJson(ExampleSchemaDifferent);

const secret = Redacted.make("EXAMPLE_SUPER_SECURE_SECRET");

it.effect(
	"Should support basic back and forth flow",
	Effect.fn(function* () {
		const cookieSigner = yield* CookieSigner;
		const data = ExampleSchema.make({ bar: "Hello world!", foo: 5 });

		const encoded = yield* cookieSigner.encode(ExampleSchemaJson, data, secret);

		expect(encoded).toMatchInlineSnapshot(
			// eslint-disable-next-line no-secrets/no-secrets -- encoded value it's expected, cspell:disable-next-line
			`"eyJiYXIiOiJIZWxsbyB3b3JsZCEiLCJmb28iOjV9.z0JN9QO-PXi8bOYLn0cARz0FhXVfEEZyfKwZwv3BmWUfnsJj8WR5-CNOcmK-CU42AH78eVcekme-E3U_ERt-Sg"`,
		);

		const decoded = yield* cookieSigner.decode(encoded, ExampleSchemaJson, secret);

		expect(decoded).toEqual(Option.some(data));
	}, Effect.provide(CookieSigner.Live)),
);

it.effect(
	"Should work with multiple secrets",
	Effect.fn(function* () {
		const cookieSigner = yield* CookieSigner;
		const data = ExampleSchema.make({ bar: "Hello world!", foo: 5 });
		const secrets = Array.make(secret, Redacted.make("EXAMPLE_SUPER_SECURE_SECRET_BUT_DIFFERENT"));

		const encoded = yield* cookieSigner.encode(ExampleSchemaJson, data, secrets);

		expect(encoded).toMatchInlineSnapshot(
			// eslint-disable-next-line no-secrets/no-secrets -- encoded value it's expected, cspell:disable-next-line
			`"eyJiYXIiOiJIZWxsbyB3b3JsZCEiLCJmb28iOjV9.owK1D4E7mmptJFcAAq_D0bq_AK67E3dTULaHEIKpESilm85DE4ioYb7fYAiR0EaPo_bXkdx12P2BMEdbN1hK9w"`,
		);

		const decoded = yield* cookieSigner.decode(encoded, ExampleSchemaJson, secrets);

		expect(decoded).toEqual(Option.some(data));
	}, Effect.provide(CookieSigner.Live)),
);

it.effect(
	"Should always use latest secret for encoding",
	Effect.fn(function* () {
		const cookieSigner = yield* CookieSigner;
		const data = ExampleSchema.make({ bar: "Hello world!", foo: 5 });
		const secrets = Array.make(secret, Redacted.make("EXAMPLE_SUPER_SECURE_SECRET_BUT_DIFFERENT"));

		const encoded = yield* cookieSigner.encode(ExampleSchemaJson, data, secrets);

		const decoded = yield* cookieSigner.decode(encoded, ExampleSchemaJson, Array.lastNonEmpty(secrets));

		expect(decoded).toEqual(Option.some(data));
	}, Effect.provide(CookieSigner.Live)),
);

it.effect(
	"Should not return data if signature does not match",
	Effect.fn(function* () {
		const cookieSigner = yield* CookieSigner;
		const data = ExampleSchema.make({ bar: "Hello world!", foo: 5 });

		const encoded = yield* cookieSigner.encode(ExampleSchemaJson, data, secret);

		const decoded = yield* cookieSigner.decode(`${encoded}-example`, ExampleSchemaJson, secret);

		expect(decoded).toEqual(Option.none());
	}, Effect.provide(CookieSigner.Live)),
);

it.effect(
	"Should not return data if different secret is used",
	Effect.fn(function* () {
		const cookieSigner = yield* CookieSigner;
		const data = ExampleSchema.make({ bar: "Hello world!", foo: 5 });
		const encoded = yield* cookieSigner.encode(ExampleSchemaJson, data, secret);

		const decoded = yield* cookieSigner.decode(
			encoded,
			ExampleSchemaJson,
			Redacted.make("EXAMPLE_SUPER_SECURE_SECRET_BUT_DIFFERENT"),
		);

		expect(decoded).toEqual(Option.none());
	}, Effect.provide(CookieSigner.Live)),
);

it.effect(
	"Should not return data if schema does not match",
	Effect.fn(function* () {
		const cookieSigner = yield* CookieSigner;
		const data = ExampleSchema.make({ bar: "Hello world!", foo: 5 });

		const encoded = yield* cookieSigner.encode(ExampleSchemaJson, data, secret);

		const decoded = yield* cookieSigner.decode(encoded, ExampleSchemaDifferentJson, secret);

		expect(decoded).toEqual(Option.none());
	}, Effect.provide(CookieSigner.Live)),
);

it.effect(
	"Should correctly decode to empty option with empty value",
	Effect.fn(function* () {
		const cookieSigner = yield* CookieSigner;

		const decoded = yield* cookieSigner.decode("", ExampleSchemaJson, secret);

		expect(decoded).toEqual(Option.none());
	}, Effect.provide(CookieSigner.Live)),
);
