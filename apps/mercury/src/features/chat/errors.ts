import { Schema } from "effect";

export class MissingConversationError extends Schema.TaggedError<MissingConversationError>(
	"@naamio/mercury/Chat/MissingConversationError",
)("MissingConversationError", {}) {}

export class MissingMessageError extends Schema.TaggedError<MissingMessageError>(
	"@naamio/mercury/Chat/MissingMessageError",
)("MissingMessageError", {}) {}

export class EmptyUserMessageError extends Schema.TaggedError<EmptyUserMessageError>(
	"@naamio/mercury/Chat/EmptyUserMessageError",
)("EmptyUserMessageError", {}) {}

export class GenerationAlreadyInProgressError extends Schema.TaggedError<GenerationAlreadyInProgressError>(
	"@naamio/mercury/Chat/GenerationAlreadyInProgressError",
)("GenerationAlreadyInProgressError", {}) {}
