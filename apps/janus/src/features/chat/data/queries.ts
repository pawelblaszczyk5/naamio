import { and, eq, inArray, useLiveQuery } from "@tanstack/react-db";

import type { Conversation } from "#src/features/chat/data/conversation.js";
import type { InflightChunk } from "#src/features/chat/data/inflight-chunk.js";
import type { MessagePart } from "#src/features/chat/data/message-part.js";
import type { AgentMessage, UserMessage } from "#src/features/chat/data/message.js";

import { conversationCollection } from "#src/features/chat/data/conversation.js";
import { inflightChunkCollection } from "#src/features/chat/data/inflight-chunk.js";
import { messagePartCollection } from "#src/features/chat/data/message-part.js";
import { messageCollection } from "#src/features/chat/data/message.js";

export const useAvailableConversations = () =>
	useLiveQuery((q) =>
		q
			.from({ conversation: conversationCollection })
			.select(({ conversation }) => ({ id: conversation.id, title: conversation.title }))
			.orderBy(({ conversation }) => conversation.createdAt, "desc"),
	).data;

export const useConversationById = (id: Conversation["id"]) =>
	useLiveQuery(
		(q) =>
			q
				.from({ conversation: conversationCollection })
				.where(({ conversation }) => eq(conversation.id, id))
				.findOne(),
		[id],
	).data;

export const useMessagesByConversationId = (conversationId: Conversation["id"]) =>
	useLiveQuery(
		(q) =>
			q
				.from({ message: messageCollection })
				.where(({ message }) => eq(message.conversationId, conversationId))
				.orderBy(({ message }) => message.createdAt, "asc"),

		[conversationId],
	).data;

export const useAgentMessagePartsByMessageId = (messageId: AgentMessage["id"]) => {
	const agentMessagePartTypes = ["TEXT", "REASONING"] satisfies Array<MessagePart["type"]>;

	const messageParts = useLiveQuery(
		(q) =>
			q
				.from({ messagePart: messagePartCollection })
				.where(({ messagePart }) =>
					and(eq(messagePart.messageId, messageId), inArray(messagePart.type, agentMessagePartTypes)),
				)
				.orderBy(({ messagePart }) => messagePart.createdAt, "asc"),
		[messageId],
	).data;

	return messageParts as ReadonlyArray<Extract<MessagePart, { type: (typeof agentMessagePartTypes)[number] }>>;
};

export const useUserMessagePartsByMessageId = (messageId: UserMessage["id"]) => {
	const userMessagePartTypes = ["TEXT"] satisfies Array<MessagePart["type"]>;

	const messageParts = useLiveQuery(
		(q) =>
			q
				.from({ messagePart: messagePartCollection })
				.where(({ messagePart }) =>
					and(eq(messagePart.messageId, messageId), inArray(messagePart.type, userMessagePartTypes)),
				)
				.orderBy(({ messagePart }) => messagePart.createdAt, "asc"),
		[messageId],
	).data;

	return messageParts as ReadonlyArray<Extract<MessagePart, { type: (typeof userMessagePartTypes)[number] }>>;
};

export const useInflightChunksByMessagePartId = (messagePartId: InflightChunk["messagePartId"]) =>
	useLiveQuery(
		(q) =>
			q
				.from({ inflightChunk: inflightChunkCollection })
				.where(({ inflightChunk }) => eq(inflightChunk.messagePartId, messagePartId))
				.orderBy(({ inflightChunk }) => inflightChunk.sequence, "asc"),
		[messagePartId],
	).data;
