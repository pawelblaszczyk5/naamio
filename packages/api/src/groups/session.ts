import { Schema, Struct } from "effect";
import { HttpApiEndpoint, HttpApiError, HttpApiGroup, OpenApi } from "effect/unstable/httpapi";

import { ElectricProtocolQuery } from "@naamio/schema/api";
import { SessionModel, TransactionId } from "@naamio/schema/domain";

import { BadGateway } from "#src/errors/mod.js";
import { AuthenticatedOnly } from "#src/middlewares/authenticated-only.js";

export class Session extends HttpApiGroup.make("Session")
	.add(
		HttpApiEndpoint.post("verify", "/verify", {
			success: SessionModel.json
				.mapFields(Struct.pick(["expiresAt", "id"]))
				.pipe(Schema.fieldsAssign({ refreshed: Schema.Boolean })),
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Verify session provided with the request making sure its still valid. This endpoint also optionally extends the session if it falls within the extension window.",
				summary: "Verify and (if available) extend the session.",
			}),
		),
	)
	.add(
		HttpApiEndpoint.post("revoke", "/:sessionId/revoke", {
			error: [HttpApiError.BadRequest, HttpApiError.NotFound],
			params: { sessionId: SessionModel.json.fields.id },
			success: Schema.Struct({ transactionId: TransactionId }),
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Revokes given session, it may be used to revoke session provided with the current request. It should be used as a security measure if user detects suspicious activity within their sessions. It can also be used for sign out functionality if used with current session id. Returns Postgres transaction id for Electric sync purposes.",
				summary: "Revoke provided session by its id.",
			}),
		),
	)
	.add(
		HttpApiEndpoint.post("revokeAll", "/revoke-all").annotateMerge(
			OpenApi.annotations({
				description:
					"Revokes all sessions for currently authenticated user, including the one provided with the current request. It should be used as a security measure if something concerning happens - e.g. user loses access to their device which has passkey on it.",
				summary: "Revokes all sessions for current user.",
			}),
		),
	)
	.add(
		HttpApiEndpoint.get("shape", "/shape", { error: BadGateway, query: ElectricProtocolQuery }).annotateMerge(
			OpenApi.annotations({
				description:
					"Electric shape that syncs all available session for current user, without any additional filtering. It uses the recommended Auth Proxy pattern from the Electric documentation and allows consuming shape through standard API-like endpoint, with built-in authentication, authorization and access control.",
				summary: "Electric session shape",
			}),
		),
	)
	.prefix("/session")
	.middleware(AuthenticatedOnly)
	.annotateMerge(
		OpenApi.annotations({
			description: "Everything related to managing already existing sessions by authenticated user.",
		}),
	) {}
