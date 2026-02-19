import { Schema } from "effect";

export class BadGateway extends Schema.TaggedErrorClass<BadGateway>("@naamio/api/BadGateway")(
	"BadGateway",
	{},
	{ httpApiStatus: 502 },
) {}
