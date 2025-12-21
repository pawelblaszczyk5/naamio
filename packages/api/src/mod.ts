import { HttpApi, OpenApi } from "@effect/platform";

import { ExampleGroup } from "#src/modules/example.js";

export class NaamioApi extends HttpApi.make("naamioApi")
	.prefix("/api")
	.add(ExampleGroup)
	.annotateContext(
		OpenApi.annotations({
			description:
				"Internal API of the application, used for communication between any of the frontend systems and the one true backend - Mercury",
			title: "Naamio API",
		}),
	) {}
