import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware, HttpServer } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Config, Effect, Layer } from "effect";
import { createServer } from "node:http";

import { NaamioApiServerLive } from "#src/modules/api-server/mod.js";
import { DatabaseLive } from "#src/modules/database/mod.js";

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
	HttpServer.withLogAddress,
	Layer.provide(HttpApiSwagger.layer({ path: "/docs" })),
	Layer.provide(NaamioApiServerLive),
	Layer.provide(
		Layer.unwrapEffect(
			Effect.gen(function* () {
				const PORT = yield* Config.number("PORT");

				return NodeHttpServer.layer(createServer, { port: PORT });
			}),
		),
	),
);

const EnvironmentLive = Layer.mergeAll(HttpLive, DatabaseLive);

EnvironmentLive.pipe(Layer.launch, NodeRuntime.runMain);
