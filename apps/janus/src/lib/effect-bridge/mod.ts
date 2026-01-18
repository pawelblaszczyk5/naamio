import type { Redacted } from "effect";

import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { Effect, Layer, Logger, ManagedRuntime, Option } from "effect";

import { ObservabilityLive } from "@naamio/observability";

import { CookieSigner } from "#src/features/auth/utilities/cookie-signer.js";
import { getDecodedSessionTokenFromSessionCookie } from "#src/features/auth/utilities/cookies.js";
import { NaamioApiClient, NaamioHttpClient } from "#src/lib/api-client/mod.js";
import { SessionToken } from "#src/lib/effect-bridge/context.js";

const EnvironmentLive = Layer.mergeAll(NaamioHttpClient.Live, NaamioApiClient.Live, CookieSigner.Live).pipe(
	Layer.provide([Logger.pretty, ObservabilityLive]),
);

const runtime = ManagedRuntime.make(EnvironmentLive);

export const runServerFn = async <A, E, R extends ManagedRuntime.ManagedRuntime.Context<typeof runtime>>(
	effect: Effect.Effect<A, E, R>,
) => effect.pipe(runtime.runPromise);

export const sessionTokenMiddleware = createMiddleware().server(async (ctx) => {
	const sessionToken = await getDecodedSessionTokenFromSessionCookie().pipe(
		Effect.map(Option.getOrNull),
		Effect.withTracerEnabled(false),
		runtime.runPromise,
	);

	return ctx.next({ context: { sessionToken } });
});

export const runAuthenticatedOnlyServerFn =
	(ctx: { context: { sessionToken: null | Redacted.Redacted } }) =>
	async <A, E, R extends ManagedRuntime.ManagedRuntime.Context<typeof runtime> | SessionToken>(
		effect: Effect.Effect<A, E, R>,
	) => {
		const sessionToken = ctx.context.sessionToken;

		if (!sessionToken) {
			throw redirect({ params: { language: "en-US" }, to: "/{$language}/sign-in" });
		}

		return effect.pipe(Effect.provideService(SessionToken, sessionToken), runtime.runPromise);
	};
