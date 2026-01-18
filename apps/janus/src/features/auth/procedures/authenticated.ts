import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { setSessionCookie } from "#src/features/auth/utilities/cookies.js";
import { NaamioApiClient } from "#src/lib/api-client/mod.js";
import { SessionToken } from "#src/lib/effect-bridge/context.js";
import { runAuthenticatedOnlyServerFn, sessionTokenMiddleware } from "#src/lib/effect-bridge/mod.js";

export const verifySession = createServerFn({ method: "POST" })
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;
			const sessionToken = yield* SessionToken;

			const result = yield* naamioApiClient.Session.verify();

			if (!result.refreshed) {
				return { id: result.id };
			}

			yield* setSessionCookie({ token: sessionToken }, result.expiresAt);

			return { id: result.id };
		}).pipe(runAuthenticatedOnlyServerFn(ctx)),
	);
