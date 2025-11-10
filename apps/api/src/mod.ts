import { HttpApi, HttpApiBuilder, HttpApiSwagger, HttpMiddleware } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Config, Effect, Layer } from "effect";
import { createServer } from "node:http";

const Api = HttpApi.make("MyApi");

const ApiLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
	Layer.provide(HttpApiSwagger.layer({ path: "/swagger" })),
	Layer.provide(HttpApiBuilder.api(Api)),
	Layer.provide(
		Layer.unwrapEffect(
			Effect.gen(function* () {
				const PORT = yield* Config.number("PORT");

				return NodeHttpServer.layer(createServer, { port: PORT });
			}),
		),
	),
);

const EnvironmentLive = Layer.mergeAll(ApiLive);

EnvironmentLive.pipe(Layer.launch, NodeRuntime.runMain);
