import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export class BadGateway extends Schema.TaggedError<BadGateway>("@naamio/api/BadGateway")(
	"BadGateway",
	{},
	HttpApiSchema.annotations({ status: 502 }),
) {}
