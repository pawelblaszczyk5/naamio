import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export class TooManyRequests extends Schema.TaggedError<TooManyRequests>()(
	"TooManyRequests",
	{},
	HttpApiSchema.annotations({ status: 429 }),
) {}

export class InsufficientStorage extends Schema.TaggedError<InsufficientStorage>()(
	"InsufficientStorage",
	{},
	HttpApiSchema.annotations({ status: 507 }),
) {}
