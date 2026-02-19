import { ServiceMap } from "effect";
import { HttpApiError, HttpApiMiddleware, HttpApiSecurity, OpenApi } from "effect/unstable/httpapi";

import type { SessionModel } from "@naamio/schema/domain";

export class CurrentSession extends ServiceMap.Service<
	CurrentSession,
	Pick<SessionModel, "expiresAt" | "id" | "userId">
>()("@naamio/api/CurrentSession") {}

export class AuthenticatedOnly extends HttpApiMiddleware.Service<AuthenticatedOnly, { provides: CurrentSession }>()(
	"AuthenticatedOnly",
	{
		error: HttpApiError.Unauthorized,
		security: {
			sessionToken: HttpApiSecurity.bearer.pipe(
				HttpApiSecurity.annotateMerge(
					OpenApi.annotations({
						description: "Allows authentication via session token minted previously by completing challenge",
					}),
				),
			),
		},
	},
) {}
