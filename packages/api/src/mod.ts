import { HttpApi, OpenApi } from "@effect/platform";

import { Authentication } from "#src/groups/authentication.js";
import { Session } from "#src/groups/session.js";

export class NaamioApi extends HttpApi.make("NaamioApi")
	.add(Authentication)
	.add(Session)
	.prefix("/api")
	.annotateContext(
		OpenApi.annotations({
			description:
				"Internal API of the application, used for communication between any of the frontend systems and the one true backend - Mercury.",
			title: "Naamio API",
		}),
	) {}
