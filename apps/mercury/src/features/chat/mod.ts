import type { Effect } from "effect";

import { Context } from "effect";

import type { CurrentSession } from "@naamio/api/middlewares/authenticated-only";
import type {
	AgentMessageModel,
	ConversationModel,
	TextMessagePartModel,
	TransactionId,
	UserMessageModel,
} from "@naamio/schema/domain";

type UserMessageParts = Pick<TextMessagePartModel, "data" | "id" | "type">;

interface RootUserMessage {
	id: UserMessageModel["id"];
	parts: Array<UserMessageParts>;
}

interface UserMessage {
	id: UserMessageModel["id"];
	parentId: UserMessageModel["parentId"];
	parts: Array<UserMessageParts>;
}

type AgentMessage = Pick<AgentMessageModel, "id">;

export class Chat extends Context.Tag("@naamio/mercury/Chat")<
	Chat,
	{
		viewer: {
			continueConversation: (data: {
				conversationId: ConversationModel["id"];
				newMessages: [UserMessage, AgentMessage];
			}) => Effect.Effect<{ transactionId: TransactionId }, never, CurrentSession>;
			regenerateAnswer: (data: {
				conversationId: ConversationModel["id"];
				messageId: UserMessageModel["id"];
				newMessage: AgentMessage;
			}) => Effect.Effect<{ transactionId: TransactionId }, never, CurrentSession>;
			startConversation: (data: {
				conversationId: ConversationModel["id"];
				initialMessages: [RootUserMessage, AgentMessage];
			}) => Effect.Effect<{ transactionId: TransactionId }, never, CurrentSession>;
		};
	}
>() {}
