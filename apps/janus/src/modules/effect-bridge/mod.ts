import type { Redacted } from "effect";

import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { Effect, Layer, Logger, ManagedRuntime, Option } from "effect";

import { ObservabilityLive } from "@naamio/observability";

import { NaamioApiClient } from "#src/modules/api-client/mod.js";
import { CookieSigner } from "#src/modules/cookie-signer/mod.js";
import { SessionToken } from "#src/modules/effect-bridge/context.js";
import { getDecodedSessionTokenFromSessionCookie } from "#src/modules/session/cookies.js";

const EnvironmentLive = Layer.mergeAll(NaamioApiClient.Live, CookieSigner.Live).pipe(
	Layer.provide([Logger.pretty, ObservabilityLive]),
);

const runtime = ManagedRuntime.make(EnvironmentLive);

export const runServerFn = async <A, E, R extends ManagedRuntime.ManagedRuntime.Context<typeof runtime>>(
	effect: Effect.Effect<A, E, R>,
) => effect.pipe(runtime.runPromise);

export const sessionTokenMiddleware = createMiddleware({ type: "function" }).server(async (ctx) => {
	const sessionToken = await Effect.gen(function* () {
		return yield* getDecodedSessionTokenFromSessionCookie().pipe(Effect.map(Option.getOrNull));
	}).pipe(Effect.withTracerEnabled(false), runtime.runPromise);

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
