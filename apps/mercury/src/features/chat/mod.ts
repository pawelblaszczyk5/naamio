import type { Effect } from "effect";

import { Context, Schema } from "effect";

import type { CurrentSession } from "@naamio/api/middlewares/authenticated-only";
import type {
	AgentMessageModel,
	ConversationModel,
	TextMessagePartModel,
	TransactionId,
	UserMessageModel,
} from "@naamio/schema/domain";

interface TextMessagePart {
	data: TextMessagePartModel["data"];
	id: TextMessagePartModel["id"];
	type: TextMessagePartModel["type"];
}

type UserMessageParts = TextMessagePart;

interface RootUserMessage {
	id: UserMessageModel["id"];
	parts: Array<UserMessageParts>;
}

interface UserMessage {
	id: UserMessageModel["id"];
	parentId: UserMessageModel["parentId"];
	parts: Array<UserMessageParts>;
}

interface AgentMessage {
	id: AgentMessageModel["id"];
}

export class MissingConversationError extends Schema.TaggedError<MissingConversationError>(
	"@naamio/mercury/Chat/MissingConversationError",
)("MissingConversationError", {}) {}

export class MissingMessageError extends Schema.TaggedError<MissingMessageError>(
	"@naamio/mercury/Chat/MissingMessageError",
)("MissingMessageError", {}) {}

export class EmptyUserMessageError extends Schema.TaggedError<EmptyUserMessageError>(
	"@naamio/mercury/Chat/EmptyUserMessageError",
)("EmptyUserMessageError", {}) {}

export class Chat extends Context.Tag("@naamio/mercury/Chat")<
	Chat,
	{
		viewer: {
			continueConversation: (data: {
				conversationId: ConversationModel["id"];
				newMessages: [UserMessage, AgentMessage];
			}) => Effect.Effect<
				{ transactionId: TransactionId },
				EmptyUserMessageError | MissingConversationError,
				CurrentSession
			>;
			regenerateAnswer: (data: {
				conversationId: ConversationModel["id"];
				messageId: UserMessageModel["id"];
				newMessage: AgentMessage;
			}) => Effect.Effect<
				{ transactionId: TransactionId },
				MissingConversationError | MissingMessageError,
				CurrentSession
			>;
			startConversation: (data: {
				conversationId: ConversationModel["id"];
				initialMessages: [RootUserMessage, AgentMessage];
			}) => Effect.Effect<{ transactionId: TransactionId }, EmptyUserMessageError, CurrentSession>;
		};
	}
>() {}
