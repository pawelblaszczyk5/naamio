import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export class TooManyRequests extends Schema.TaggedError<TooManyRequests>("@naamio/api/TooManyRequests")(
	"TooManyRequests",
	{},
	HttpApiSchema.annotations({ status: 429 }),
) {}

export class InsufficientStorage extends Schema.TaggedError<InsufficientStorage>("@naamio/api/InsufficientStorage")(
	"InsufficientStorage",
	{},
	HttpApiSchema.annotations({ status: 507 }),
) {}

export class BadGateway extends Schema.TaggedError<BadGateway>("@naamio/api/BadGateway")(
	"BadGateway",
	{},
	HttpApiSchema.annotations({ status: 502 }),
) {}
