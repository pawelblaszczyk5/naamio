import { createServerFn } from "@tanstack/react-start";
import { Effect, Option } from "effect";

import { deleteSessionCookie, setSessionCookie } from "#src/features/auth/utilities/cookies.js";
import { NaamioApiClient } from "#src/lib/api-client/mod.js";
import { SessionToken } from "#src/lib/effect-bridge/context.js";
import { runAuthenticatedOnlyServerFn, sessionTokenMiddleware } from "#src/lib/effect-bridge/mod.js";

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
