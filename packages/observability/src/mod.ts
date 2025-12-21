// NOTE this is a namespace import to don't get other OTEL libraries into the bundle in dev mode
import * as Otlp from "@effect/opentelemetry/Otlp";
import { FetchHttpClient } from "@effect/platform";
import { Config, Effect, Layer } from "effect";

export const ObservabilityLive = Layer.unwrapEffect(
	Effect.gen(function* () {
		const BASE_URL = yield* Config.string("OBSERVABILITY_BASE_URL");
		const SERVICE_NAME = yield* Config.string("OBSERVABILITY_SERVICE_NAME");

		return Otlp.layer({ baseUrl: BASE_URL, resource: { serviceName: SERVICE_NAME } });
	}),
).pipe(Layer.provide(FetchHttpClient.layer));
