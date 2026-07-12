import { NodeHttpClient } from "@effect/platform-node";
import { Config, Effect, Layer, Logger } from "effect";
import { Otlp } from "effect/unstable/observability";

export const ObservabilityLayer = Layer.unwrap(
	Effect.gen(function* () {
		const NODE_ENV = yield* Config.literals(["development", "production"], "NODE_ENV");

		const loggerLayer = Logger.layer([
			NODE_ENV === "development" ? Logger.consolePretty({ colors: true }) : Logger.consoleJson,
		]);

		const OTEL_ENABLED = yield* Config.boolean("OTEL_ENABLED");

		if (!OTEL_ENABLED) {
			return loggerLayer;
		}

		const BASE_URL = yield* Config.string("OTEL_BASE_URL");
		const SERVICE_NAME = yield* Config.string("OTEL_SERVICE_NAME");

		return Layer.provideMerge(
			loggerLayer,
			Otlp.layerJson({ baseUrl: BASE_URL, resource: { serviceName: SERVICE_NAME } }).pipe(
				Layer.provide(NodeHttpClient.layerUndici),
			),
		);
	}),
);
