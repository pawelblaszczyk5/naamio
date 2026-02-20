import type { ManagedRuntime, Redacted } from "effect";

import { redirect } from "@tanstack/react-router";
import { Effect } from "effect";

import { SessionToken } from "#src/lib/effect-bridge/context.js";
import { runtime } from "#src/lib/effect-bridge/runtime.js";

import "@tanstack/react-start/server-only";

type RuntimeContext = typeof runtime extends ManagedRuntime.ManagedRuntime<infer Context, any> ? Context : never;

export const runServerFn = async <A, E, R extends RuntimeContext>(effect: Effect.Effect<A, E, R>) =>
	effect.pipe(runtime.runPromise);

export const runAuthenticatedOnlyServerFn =
	(ctx: { context: { sessionToken: null | Redacted.Redacted } }) =>
	async <A, E, R extends RuntimeContext | SessionToken>(effect: Effect.Effect<A, E, R>) => {
		const sessionToken = ctx.context.sessionToken;

		if (!sessionToken) {
			throw redirect({ params: { language: "en-US" }, to: "/{$language}/sign-in" });
		}

		return effect.pipe(Effect.provideService(SessionToken, sessionToken), runtime.runPromise);
	};
