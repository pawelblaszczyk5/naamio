import { HttpApi, OpenApi } from "@effect/platform";

import { Authentication } from "#src/groups/authentication.js";

export class NaamioApi extends HttpApi.make("naamioApi")
	.add(Authentication)
	.prefix("/api")
	.annotateContext(
		OpenApi.annotations({
			description:
				"Internal API of the application, used for communication between any of the frontend systems and the one true backend - Mercury",
			title: "Naamio API",
		}),
	) {}
