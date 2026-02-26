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

export class MessagePartMaterializationError extends Schema.TaggedErrorClass<MessagePartMaterializationError>(
	"@naamio/mercury/Chat/MessagePartMaterializationError",
)("MessagePartMaterializationError", {}) {}

export class MessageAlreadyTransitionedError extends Schema.TaggedErrorClass<MessageAlreadyTransitionedError>(
	"@naamio/mercury/Chat/MessageAlreadyTransitionedError",
)("MessageAlreadyTransitionedError", {}) {}

export class ConversationGenerationManagerNetworkingError extends Schema.TaggedErrorClass<ConversationGenerationManagerNetworkingError>(
	"@naamio/mercury/Chat/ConversationGenerationManagerNetworkingError",
)("ConversationGenerationManagerNetworkingError", {}) {}
