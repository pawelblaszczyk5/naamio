import { Schema, Struct } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi";

import { ElectricProtocolQuery } from "@naamio/schema/api";
import { TransactionId, UserModel } from "@naamio/schema/domain";

import { BadGateway } from "#src/errors/mod.js";
import { AuthenticatedOnly } from "#src/middlewares/authenticated-only.js";

export class User extends HttpApiGroup.make("User")
	.add(
		HttpApiEndpoint.patch("updateLanguage", "/language", {
			payload: UserModel.jsonUpdate.mapFields(Struct.pick(["language"])),
			success: Schema.Struct({ transactionId: TransactionId }),
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Allows updating current user language preference. Returns Postgres transaction id for Electric sync purposes.",
				summary: "Update current user language",
			}),
		),
	)
	.add(
		HttpApiEndpoint.get("shape", "/shape", { error: BadGateway, query: ElectricProtocolQuery }).annotateMerge(
			OpenApi.annotations({
				description:
					"Electric shape that syncs data about current user. It uses the recommended Auth Proxy pattern from the Electric documentation and allows consuming shape through standard API-like endpoint, with built-in authentication, authorization and access control.",
				summary: "Electric user shape",
			}),
		),
	)
	.prefix("/user")
	.middleware(AuthenticatedOnly)
	.annotateMerge(
		OpenApi.annotations({
			description: "Everything related to user inside of the app. Their preferences, settings, etc",
		}),
	) {}
