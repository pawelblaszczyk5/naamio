import { NodeHttpClient } from "@effect/platform-node";
import { Config, Effect, Layer } from "effect";
import { Otlp } from "effect/unstable/observability";

export const ObservabilityLayer = Layer.unwrap(
	Effect.gen(function* () {
		const BASE_URL = yield* Config.string("OBSERVABILITY_BASE_URL");
		const SERVICE_NAME = yield* Config.string("OBSERVABILITY_SERVICE_NAME");

		return Otlp.layerJson({ baseUrl: BASE_URL, resource: { serviceName: SERVICE_NAME } });
	}),
).pipe(Layer.provide(NodeHttpClient.layerNodeHttp));
