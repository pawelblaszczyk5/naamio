import { Schema } from "effect";

export class BadGateway extends Schema.TaggedErrorClass<BadGateway>("@naamio/api/BadGateway")(
	"BadGateway",
	{},
	{ httpApiStatus: 502 },
) {}

export class InsufficientStorage extends Schema.TaggedErrorClass<InsufficientStorage>(
	"@naamio/api/InsufficientStorage",
)("InsufficientStorage", {}, { httpApiStatus: 507 }) {}
