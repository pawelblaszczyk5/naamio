import { HttpApiBuilder } from "@effect/platform";
import { Effect, Layer } from "effect";

import { NaamioApi } from "@naamio/api";

const ExampleGroupLive = HttpApiBuilder.group(
	NaamioApi,
	"example",
	Effect.fn(function* (handlers) {
		return handlers.handle(
			"greeting",
			Effect.fn(function* () {
				return "Hello Thomas!";
			}),
		);
	}),
);

export const NaamioApiServerLive = HttpApiBuilder.api(NaamioApi).pipe(Layer.provide(ExampleGroupLive));
