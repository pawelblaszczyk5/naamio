import { Schema } from "effect";

export class MissingConversationError extends Schema.TaggedErrorClass<MissingConversationError>(
	"@naamio/mercury/Chat/MissingConversationError",
)("MissingConversationError", {}) {}

export class MissingMessageError extends Schema.TaggedErrorClass<MissingMessageError>(
	"@naamio/mercury/Chat/MissingMessageError",
)("MissingMessageError", {}) {}

export class GenerationAlreadyInProgressError extends Schema.TaggedErrorClass<GenerationAlreadyInProgressError>(
	"@naamio/mercury/Chat/GenerationAlreadyInProgressError",
)("GenerationAlreadyInProgressError", {}) {}

export class CompactionDataError extends Schema.TaggedErrorClass<CompactionDataError>(
	"@naamio/mercury/Chat/CompactionDataError",
)("MissingCompactionDataError", {}) {}

export class MessageAlreadyTransitionedError extends Schema.TaggedErrorClass<MessageAlreadyTransitionedError>(
	"@naamio/mercury/Chat/MessageAlreadyTransitionedError",
)("MessageAlreadyTransitionedError", {}) {}
