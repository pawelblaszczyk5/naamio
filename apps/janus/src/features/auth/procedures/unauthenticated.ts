import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { DateTime, Effect, Option, Schema } from "effect";

import { EmailChallengeCode, EmailChallengeModel } from "@naamio/schema/domain";

import {
	deleteChallengeCookie,
	getDecodedStateFromChallengeCookie,
	setChallengeCookie,
	setSessionCookie,
} from "#src/features/auth/utilities/cookies.js";
import { extractDeviceLabel } from "#src/features/auth/utilities/device-label.js";
import { NaamioApiClient } from "#src/lib/api-client/mod.js";
import { sessionTokenMiddleware } from "#src/lib/effect-bridge/middleware.js";
import { runServerFn } from "#src/lib/effect-bridge/mod.js";

export const getAuthenticationChallengeMetadata = createServerFn({ method: "GET" }).handler(async () =>
	Effect.gen(function* () {
		const naamioApiClient = yield* NaamioApiClient;

		const maybeState = yield* getDecodedStateFromChallengeCookie();

		if (Option.isNone(maybeState)) {
			return null;
		}

		const result = yield* naamioApiClient.Authentication.getEmailChallengeMetadata({
			path: { state: maybeState.value },
		});

		return {
			email: result.email,
			expiresAt: result.expiresAt.pipe(DateTime.formatIso),
			language: result.language,
			refreshAvailableAt: result.refreshAvailableAt.pipe(DateTime.formatIso),
			remainingAttempts: result.remainingAttempts,
		};
	}).pipe(Effect.withSpan("@naamio/janus/session/getAuthenticationChallengeMetadata"), runServerFn),
);

const InitializeAuthenticationChallengeData = EmailChallengeModel.json.pick("email", "language");

export const initializeAuthenticationChallenge = createServerFn({ method: "POST" })
	.inputValidator(Schema.standardSchemaV1(InitializeAuthenticationChallengeData))
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const result = yield* naamioApiClient.Authentication.initializeEmailChallenge({
				payload: { email: ctx.data.email, language: ctx.data.language },
			});

			yield* setChallengeCookie({ state: result.state }, result.expiresAt);
		}).pipe(Effect.withSpan("@naamio/janus/session/initializeAuthenticationChallenge"), runServerFn),
	);

const SolveAuthenticationChallengeData = Schema.Struct({ code: EmailChallengeCode });

export const solveAuthenticationChallenge = createServerFn({ method: "POST" })
	.inputValidator(Schema.standardSchemaV1(SolveAuthenticationChallengeData))
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const state = yield* yield* getDecodedStateFromChallengeCookie();
			const userAgent = getRequestHeader("User-Agent");

			const deviceLabel = userAgent ? yield* extractDeviceLabel(userAgent) : Option.none();

			const result = yield* naamioApiClient.Authentication.solveEmailChallenge({
				path: { state },
				payload: { code: ctx.data.code, deviceLabel },
			});

			yield* setSessionCookie({ token: result.token }, result.expiresAt);
			yield* deleteChallengeCookie();

			redirect({ replace: true, to: "/app" });
		}).pipe(Effect.withSpan("@naamio/janus/session/solveAuthenticationChallenge"), runServerFn),
	);

export const refreshAuthenticationChallenge = createServerFn({ method: "POST" }).handler(async () =>
	Effect.gen(function* () {
		const naamioApiClient = yield* NaamioApiClient;

		const state = yield* yield* getDecodedStateFromChallengeCookie();

		const result = yield* naamioApiClient.Authentication.refreshEmailChallenge({ path: { state } });

		yield* setChallengeCookie({ state: result.state }, result.expiresAt);
	}).pipe(Effect.withSpan("@naamio/janus/session/refreshAuthenticationChallenge"), runServerFn),
);

export const checkHasSessionToken = createServerFn({ method: "GET" })
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			return ctx.context.sessionToken !== null;
		}).pipe(Effect.withSpan("@naamio/janus/session/checkHasSessionToken"), runServerFn),
	);
