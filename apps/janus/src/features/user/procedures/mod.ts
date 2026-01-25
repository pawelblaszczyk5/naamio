import { createServerFn } from "@tanstack/react-start";
import { Effect, Option, Schema } from "effect";

import { SessionModel, UserModel } from "@naamio/schema/domain";

import { deleteSessionCookie, setSessionCookie } from "#src/features/auth/utilities/cookies.js";
import { NaamioApiClient } from "#src/lib/api-client/mod.js";
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

			yield* setSessionCookie({ token: sessionToken }, maybeSessionResult.value.expiresAt);

			return { id: maybeSessionResult.value.id };
		}).pipe(runAuthenticatedOnlyServerFn(ctx)),
	);

const UpdateLanguagePayload = UserModel.jsonUpdate.pick("language");

export const updateLanguage = createServerFn({ method: "POST" })
	.inputValidator(Schema.standardSchemaV1(UpdateLanguagePayload))
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const result = yield* naamioApiClient.User.updateLanguage({ payload: { language: ctx.data.language } });

			return result;
		}).pipe(runAuthenticatedOnlyServerFn(ctx)),
	);

const RevokeSessionPayload = SessionModel.json.pick("id");

export const revokeSession = createServerFn({ method: "POST" })
	.inputValidator(Schema.standardSchemaV1(RevokeSessionPayload))
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const result = yield* naamioApiClient.Session.revoke({ path: { id: ctx.data.id } });

			return result;
		}).pipe(runAuthenticatedOnlyServerFn(ctx)),
	);

export const revokeAllSessions = createServerFn({ method: "POST" })
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			yield* naamioApiClient.Session.revokeAll();
		}).pipe(runAuthenticatedOnlyServerFn(ctx)),
	);
