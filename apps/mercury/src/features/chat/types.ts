import type { Array, Option } from "effect";
import type { DistributedPick, Simplify } from "type-fest";

import type {
	AgentMessageModel,
	ConversationModel,
	ReasoningMessagePartModel,
	TextMessagePartModel,
	UserMessageModel,
} from "@naamio/schema/domain";

type TextMessagePartInput = Simplify<
	Pick<TextMessagePartModel, "id" | "type"> & {
		readonly data: { readonly content: Option.Option.Value<TextMessagePartModel["data"]["content"]> };
	}
>;

export type UserMessagePartInput = TextMessagePartInput;

interface RootUserMessageInput {
	id: UserMessageModel["id"];
	parts: Array.NonEmptyReadonlyArray<UserMessagePartInput>;
}

interface UserMessageInput {
	id: UserMessageModel["id"];
	parentId: UserMessageModel["parentId"];
	parts: Array.NonEmptyReadonlyArray<UserMessagePartInput>;
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
	messages: readonly [RootUserMessageInput, AgentMessageInput];
}

export interface ContinueConversationInput {
	conversationId: ConversationModel["id"];
	messages: readonly [UserMessageInput, AgentMessageInput];
}

export interface RegenerateAnswerInput {
	conversationId: ConversationModel["id"];
	message: AgentMessageInputWithParentId;
}

export interface InterruptGenerationInput {
	conversationId: ConversationModel["id"];
	messageId: AgentMessageModel["id"];
}

export interface EditConversationTitleInput {
	conversationId: ConversationModel["id"];
	title: Option.Option.Value<ConversationModel["title"]>;
}

export interface UserMessageForGeneration {
	id: UserMessageModel["id"];
	parentId: UserMessageModel["parentId"];
	parts: Array<DistributedPick<TextMessagePartModel, "createdAt" | "data" | "type">>;
	role: UserMessageModel["role"];
}

export interface AgentMessageForGeneration {
	id: AgentMessageModel["id"];
	parentId: AgentMessageModel["parentId"];
	parts: Array<DistributedPick<ReasoningMessagePartModel | TextMessagePartModel, "createdAt" | "data" | "type">>;
	role: AgentMessageModel["role"];
	status: AgentMessageModel["status"];
}

export interface ConversationForGeneration {
	messages: Array<AgentMessageForGeneration | UserMessageForGeneration>;
	userId: ConversationModel["userId"];
}
