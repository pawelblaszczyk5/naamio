import { HttpApi, HttpApiBuilder, HttpMiddleware } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Config, Effect, Layer } from "effect";
import { createServer } from "node:http";

import { DatabaseLive } from "#src/modules/database/mod.js";

const Api = HttpApi.make("MyApi");

const ApiLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
	Layer.provide(HttpApiBuilder.api(Api)),
	Layer.provide(
		Layer.unwrapEffect(
			Effect.gen(function* () {
				const PORT = yield* Config.number("PORT");

				return NodeHttpServer.layer(createServer, { port: PORT });
			}),
		),
	),
	Layer.tap(
		Effect.fn(function* () {
			const PORT = yield* Config.number("PORT");

			yield* Effect.log(`Starting Hermes on port ${PORT.toString()}`);
		}),
	),
);

const EnvironmentLive = Layer.mergeAll(ApiLive, DatabaseLive);

EnvironmentLive.pipe(Layer.launch, NodeRuntime.runMain);
