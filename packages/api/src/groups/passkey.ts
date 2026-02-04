import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";

import { ElectricProtocolUrlParams } from "@naamio/schema/api";

import { BadGateway } from "#src/errors/mod.js";
import { AuthenticatedOnly } from "#src/middlewares/authenticated-only.js";

export class Passkey extends HttpApiGroup.make("Passkey")
	.add(
		HttpApiEndpoint.get("shape", "/shape")
			.setUrlParams(ElectricProtocolUrlParams)
			.addError(BadGateway)
			.annotateContext(
				OpenApi.annotations({
					description:
						"Electric shape that syncs data about all current user passkeys. It uses the recommended Auth Proxy pattern from the Electric documentation and allows consuming shape through standard API-like endpoint, with built-in authentication, authorization and access control.",
					summary: "Electric passkey shape",
				}),
			),
	)
	.prefix("/passkey")
	.middleware(AuthenticatedOnly)
	.annotateContext(
		OpenApi.annotations({
			description:
				"Everything related to passkey inside of the app. That's only applicable for already created passkeys - their management.",
		}),
	) {}
