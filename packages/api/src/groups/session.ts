import { HttpApiEndpoint, HttpApiError, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform";
import { Schema } from "effect";

import { SessionModel } from "@naamio/schema";

import { AuthenticatedOnly } from "#src/middlewares/authenticated-only.js";

const sessionIdParam = HttpApiSchema.param("sessionId", SessionModel.json.fields.publicId);

export class Session extends HttpApiGroup.make("Session")
	.add(
		HttpApiEndpoint.post("verify", "/verify")
			.addSuccess(SessionModel.json.pick("expiresAt").pipe(Schema.extend(Schema.Struct({ refreshed: Schema.Boolean }))))
			.annotateContext(
				OpenApi.annotations({
					description:
						"Verify session provided with the request making sure its still valid. This endpoint also optionally extends the session if it falls within the extension window.",
					summary: "Verify and (if available) extend the session.",
				}),
			),
	)
	.add(
		HttpApiEndpoint.post("revoke")`/${sessionIdParam}/revoke`
			.addError(HttpApiError.BadRequest)
			.addError(HttpApiError.NotFound)
			.annotateContext(
				OpenApi.annotations({
					description:
						"Revokes given session, it may be used to revoke session provided with the current request. It should be used as a security measure if user detects suspicious activity within their sessions.",
					summary: "Revoke provided session by its id.",
				}),
			),
	)
	.add(
		HttpApiEndpoint.post("revokeAll", "/revoke-all").annotateContext(
			OpenApi.annotations({
				description:
					"Revokes all sessions for currently authenticated user, including the one provided with the current request. It should be used as a security measure if something concerning happens - e.g. user loses access to their email address.",
				summary: "Revokes all sessions for current user.",
			}),
		),
	)
	.prefix("/session")
	.middleware(AuthenticatedOnly)
	.annotateContext(
		OpenApi.annotations({
			description: "Everything related to managing already existing sessions by authenticated user.",
		}),
	) {}
