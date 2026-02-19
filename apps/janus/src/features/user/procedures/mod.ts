import { createServerFn } from "@tanstack/react-start";
import { Effect, Option, Schema, Struct } from "effect";

import { SessionModel, UserModel } from "@naamio/schema/domain";

import { NaamioApiClient } from "#src/lib/api-client/mod.js";
import { deleteSessionCookie, setSessionCookie } from "#src/lib/cookies/mod.js";
import { SessionToken } from "#src/lib/effect-bridge/context.js";
import { sessionTokenMiddleware } from "#src/lib/effect-bridge/middleware.js";
import { runAuthenticatedOnlyServerFn } from "#src/lib/effect-bridge/mod.js";

export const verifySession = createServerFn({ method: "POST" })
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;
			const sessionToken = yield* SessionToken;

			const maybeSessionResult = yield* naamioApiClient.Session.verify().pipe(
				Effect.map(Option.some),
				Effect.catchTag("Unauthorized", () => Effect.succeed(Option.none())),
			);

			if (Option.isNone(maybeSessionResult)) {
				yield* deleteSessionCookie();

				return null;
			}

			if (!maybeSessionResult.value.refreshed) {
				return { id: maybeSessionResult.value.id };
			}

			yield* setSessionCookie(sessionToken, maybeSessionResult.value.expiresAt);

			return { id: maybeSessionResult.value.id };
		}).pipe(Effect.withSpan("@naamio/janus/user/verifySession"), runAuthenticatedOnlyServerFn(ctx)),
	);

const UpdateLanguagePayload = UserModel.jsonUpdate.mapFields(Struct.pick(["language"]));

export const updateLanguage = createServerFn({ method: "POST" })
	.inputValidator(Schema.toStandardSchemaV1(UpdateLanguagePayload))
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const result = yield* naamioApiClient.User.updateLanguage({ payload: { language: ctx.data.language } });

			return result;
		}).pipe(Effect.withSpan("@naamio/janus/user/updateLanguage"), runAuthenticatedOnlyServerFn(ctx)),
	);

const RevokeSessionPayload = SessionModel.json.mapFields(Struct.pick(["id"]));

export const revokeSession = createServerFn({ method: "POST" })
	.inputValidator(Schema.toStandardSchemaV1(RevokeSessionPayload))
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const result = yield* naamioApiClient.Session.revoke({ params: { sessionId: ctx.data.id } });

			return result;
		}).pipe(Effect.withSpan("@naamio/janus/user/revokeSession"), runAuthenticatedOnlyServerFn(ctx)),
	);

export const revokeAllSessions = createServerFn({ method: "POST" })
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			yield* naamioApiClient.Session.revokeAll();
		}).pipe(Effect.withSpan("@naamio/janus/user/revokeAllSessions"), runAuthenticatedOnlyServerFn(ctx)),
	);
