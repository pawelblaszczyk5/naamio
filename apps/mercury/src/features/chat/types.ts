import type { Array } from "effect";

import type {
	AgentMessageModel,
	ConversationModel,
	TextMessagePartModel,
	UserMessageModel,
} from "@naamio/schema/domain";

type TextMessagePartInput = Pick<TextMessagePartModel, "data" | "id" | "type">;

type UserMessagePartInput = TextMessagePartInput;

interface RootUserMessageInput {
	id: UserMessageModel["id"];
	parts: Array.NonEmptyArray<UserMessagePartInput>;
}

interface UserMessageInput {
	id: UserMessageModel["id"];
	parentId: UserMessageModel["parentId"];
	parts: Array.NonEmptyArray<UserMessagePartInput>;
}

interface AgentMessageInput {
	id: AgentMessageModel["id"];
}

interface AgentMessageInputWithParentId {
	id: AgentMessageModel["id"];
	parentId: AgentMessageModel["parentId"];
}

export interface StartConversationInput {
	conversationId: ConversationModel["id"];
	messages: [RootUserMessageInput, AgentMessageInput];
}

export interface ContinueConversationInput {
	conversationId: ConversationModel["id"];
	messages: [UserMessageInput, AgentMessageInput];
}

export interface RegenerateAnswerInput {
	conversationId: ConversationModel["id"];
	message: AgentMessageInputWithParentId;
}

export interface InterruptGenerationInput {
	conversationId: ConversationModel["id"];
	messageId: AgentMessageModel["id"];
}
