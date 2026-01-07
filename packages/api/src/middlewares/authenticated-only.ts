import { HttpApiError, HttpApiMiddleware, HttpApiSecurity, OpenApi } from "@effect/platform";
import { Context } from "effect";

import type { SessionModel } from "@naamio/schema/domain";

export class CurrentSession extends Context.Tag("@naamio/api/CurrentSession")<
	CurrentSession,
	Pick<SessionModel, "expiresAt" | "id" | "userId">
>() {}

export class AuthenticatedOnly extends HttpApiMiddleware.Tag<AuthenticatedOnly>()("AuthenticatedOnly", {
	failure: HttpApiError.Unauthorized,
	provides: CurrentSession,
	security: {
		sessionToken: HttpApiSecurity.bearer.pipe(
			HttpApiSecurity.annotateContext(
				OpenApi.annotations({
					description: "Allows authentication via session token minted previously by completing challenge",
				}),
			),
		),
	},
}) {}
