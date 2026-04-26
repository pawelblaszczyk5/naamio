import type { HttpClient } from "effect/unstable/http/HttpClient";

import { Context, Effect, Function, Option } from "effect";

export class FireworksConfig extends Context.Service<
	FireworksConfig,
	{ readonly transformClient?: ((client: HttpClient) => HttpClient) | undefined }
>()("@naamio/ai-fireworks/FireworksConfig") {
	static readonly getOrUndefined: Effect.Effect<typeof FireworksConfig.Service | undefined> = Effect.map(
		Effect.serviceOption(FireworksConfig),
		// eslint-disable-next-line unicorn/consistent-function-scoping -- that's non sense here
		(maybeFireworksConfig) => Option.getOrUndefined(maybeFireworksConfig),
	);
}

export const withTransformClient: {
	(
		transformClient: FireworksConfig["Service"]["transformClient"],
	): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
	<A, E, R>(
		self: Effect.Effect<A, E, R>,
		transformClient: FireworksConfig["Service"]["transformClient"],
	): Effect.Effect<A, E, R>;
} = Function.dual(
	2,
	<A, E, R>(
		self: Effect.Effect<A, E, R>,
		transformClient: NonNullable<FireworksConfig["Service"]["transformClient"]>,
	) =>
		Effect.flatMap(FireworksConfig.getOrUndefined, (config) =>
			Effect.provideService(self, FireworksConfig, { ...config, transformClient }),
		),
);
