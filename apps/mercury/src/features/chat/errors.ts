import { Schema } from "effect";

export class MissingConversationError extends Schema.TaggedError<MissingConversationError>(
	"@naamio/mercury/Chat/MissingConversationError",
)("MissingConversationError", {}) {}

export class MissingMessageError extends Schema.TaggedError<MissingMessageError>(
	"@naamio/mercury/Chat/MissingMessageError",
)("MissingMessageError", {}) {}

export class GenerationAlreadyInProgressError extends Schema.TaggedError<GenerationAlreadyInProgressError>(
	"@naamio/mercury/Chat/GenerationAlreadyInProgressError",
)("GenerationAlreadyInProgressError", {}) {}

export class CompactionDataError extends Schema.TaggedError<CompactionDataError>(
	"@naamio/mercury/Chat/CompactionDataError",
)("MissingCompactionDataError", {}) {}

export class MessageAlreadyTransitionedError extends Schema.TaggedError<MessageAlreadyTransitionedError>(
	"@naamio/mercury/Chat/MessageAlreadyTransitionedError",
)("MessageAlreadyTransitionedError", {}) {}
