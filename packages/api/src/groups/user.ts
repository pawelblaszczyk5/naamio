import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";

import { ElectricProtocolUrlParams } from "@naamio/schema/api";

import { BadGateway } from "#src/errors/mod.js";
import { AuthenticatedOnly } from "#src/middlewares/authenticated-only.js";

export class User extends HttpApiGroup.make("User")
	.add(
		HttpApiEndpoint.get("shape", "/shape")
			.setUrlParams(ElectricProtocolUrlParams)
			.addError(BadGateway)
			.annotateContext(
				OpenApi.annotations({
					description:
						"Electric shape that syncs data about current user. It uses the recommended Auth Proxy pattern from the Electric documentation and allows consuming shape through standard API-like endpoint, with built-in authentication, authorization and access control..",
					summary: "Electric user shape",
				}),
			),
	)
	.prefix("/user")
	.middleware(AuthenticatedOnly)
	.annotateContext(
		OpenApi.annotations({
			description: "Everything related to user inside of the app. Their preferences, settings, etc",
		}),
	) {}
