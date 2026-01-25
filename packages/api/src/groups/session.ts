import { HttpApiEndpoint, HttpApiError, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform";
import { Schema } from "effect";

import { ElectricProtocolUrlParams } from "@naamio/schema/api";
import { SessionModel, TransactionId } from "@naamio/schema/domain";

import { BadGateway } from "#src/errors/mod.js";
import { AuthenticatedOnly } from "#src/middlewares/authenticated-only.js";

const sessionIdParam = HttpApiSchema.param("id", SessionModel.json.fields.id);

export class Session extends HttpApiGroup.make("Session")
	.add(
		HttpApiEndpoint.post("verify", "/verify")
			.addSuccess(
				SessionModel.json.pick("expiresAt", "id").pipe(Schema.extend(Schema.Struct({ refreshed: Schema.Boolean }))),
			)
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
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(HttpApiError.BadRequest)
			.addError(HttpApiError.NotFound)
			.annotateContext(
				OpenApi.annotations({
					description:
						"Revokes given session, it may be used to revoke session provided with the current request. It should be used as a security measure if user detects suspicious activity within their sessions. It can also be used for sign out functionality if used with current session id. Returns Postgres transaction id for Electric sync purposes.",
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
	.add(
		HttpApiEndpoint.get("shape", "/shape")
			.setUrlParams(ElectricProtocolUrlParams)
			.addError(BadGateway)
			.annotateContext(
				OpenApi.annotations({
					description:
						"Electric shape that syncs all available session for current user, without any additional filtering. It uses the recommended Auth Proxy pattern from the Electric documentation and allows consuming shape through standard API-like endpoint, with built-in authentication, authorization and access control.",
					summary: "Electric session shape",
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
