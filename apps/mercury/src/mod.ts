import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Config, Effect, Layer, Logger } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { HttpApiSwagger } from "effect/unstable/httpapi";
import { createServer } from "node:http";

import { NaamioApi } from "@naamio/api";
import { ObservabilityLayer } from "@naamio/observability";

import { NaamioApiServerLayer } from "#src/api/mod.js";
import { CleanupExpiredChallengesCron } from "#src/features/auth/web-authn.js";
import { CleanupUnconfirmedUsersCron } from "#src/features/user/mod.js";

const Jobs = Layer.mergeAll(CleanupExpiredChallengesCron, CleanupUnconfirmedUsersCron);

const HttpLayer = NaamioApiServerLayer.pipe(
	Layer.provide(HttpApiSwagger.layer(NaamioApi, { path: "/docs" })),
	HttpRouter.serve,
	Layer.provide(
		Layer.unwrap(
			Effect.gen(function* () {
				const PORT = yield* Config.number("PORT");

				return NodeHttpServer.layer(createServer, { port: PORT });
			}),
		),
	),
);

const EnvironmentLayer = HttpLayer.pipe(
	Layer.merge(Jobs),
	Layer.provide([ObservabilityLayer, Logger.layer([Logger.consolePretty({ colors: true })])]),
);

EnvironmentLayer.pipe(Layer.launch, NodeRuntime.runMain);
