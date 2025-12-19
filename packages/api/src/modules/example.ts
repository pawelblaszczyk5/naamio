import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { Schema } from "effect";

export class ExampleGroup extends HttpApiGroup.make("example")
	.prefix("/example")
	.add(
		HttpApiEndpoint.get("greeting", "/greeting")
			.addSuccess(Schema.String)
			.annotateContext(OpenApi.annotations({ description: "What is this endpoint about?", title: "Greeting" })),
	)
	.annotateContext(OpenApi.annotations({ description: "What is this group about?", title: "Example" })) {}
