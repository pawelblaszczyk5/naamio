import { createOptimisticAction } from "@tanstack/react-db";
import { useServerFn } from "@tanstack/react-start";

import { assert } from "@naamio/assert";

import type {
	DeleteConversationPayload,
	EditConversationTitlePayload,
	InterruptGenerationPayload,
	StartConversationPayload,
} from "#src/features/chat/procedures/mod.js";

import { Conversation, conversationCollection } from "#src/features/chat/data/conversation.js";
import { messagePartCollection, TextMessagePart } from "#src/features/chat/data/message-part.js";
import { AgentMessage, messageCollection, UserMessage } from "#src/features/chat/data/message.js";
import {
	deleteConversation,
	editConversationTitle,
	interruptGeneration,
	startConversation,
} from "#src/features/chat/procedures/mod.js";
import { generateId } from "#src/lib/id-pool/mod.js";

export const useStartConversation = () => {
	const callStartConversation = useServerFn(startConversation);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callStartConversation({ data });

			return Promise.all([
				conversationCollection.utils.awaitTxId(result.transactionId),
				messageCollection.utils.awaitTxId(result.transactionId),
				messagePartCollection.utils.awaitTxId(result.transactionId),
			]);
		},
		onMutate: (data: StartConversationPayload) => {
			const now = new Date();

			conversationCollection.insert({
				accessedAt: now,
				createdAt: now,
				id: data.conversationId,
				title: null,
				updatedAt: now,
			});

			const userMessageInput = data.messages[0];
			const agentMessageInput = data.messages[1];

			messageCollection.insert({
				conversationId: data.conversationId,
				createdAt: now,
				id: userMessageInput.id,
				parentId: null,
				role: "USER",
			});

			messageCollection.insert({
				conversationId: data.conversationId,
				createdAt: now,
				id: agentMessageInput.id,
				metadata: null,
				parentId: userMessageInput.id,
				role: "AGENT",
				status: "IN_PROGRESS",
			});

			userMessageInput.parts.forEach((part) => {
				messagePartCollection.insert({
					createdAt: now,
					data: part.data,
					id: part.id,
					messageId: userMessageInput.id,
					type: "TEXT",
				});
			});
		},
	});

	const handler = (data: { content: string }) => {
		const conversationId = Conversation.fields.id.makeUnsafe(generateId());
		const userMessageId = UserMessage.fields.id.makeUnsafe(generateId());
		const userTextMessagePartId = TextMessagePart.fields.id.makeUnsafe(generateId());
		const agentMessageId = AgentMessage.fields.id.makeUnsafe(generateId());

		const transaction = action({
			conversationId,
			messages: [
				{ id: userMessageId, parts: [{ data: { content: data.content }, id: userTextMessagePartId, type: "TEXT" }] },
				{ id: agentMessageId },
			],
		});

		return { conversationId, transaction };
	};

	return handler;
};

export const useInterruptGeneration = () => {
	const callInterruptGeneration = useServerFn(interruptGeneration);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callInterruptGeneration({ data });

			return messageCollection.utils.awaitTxId(result.transactionId);
		},
		onMutate: (data: InterruptGenerationPayload) => {
			messageCollection.update(data.messageId, (draft) => {
				assert(draft.role === "AGENT", "Agent message should always be tied to AgentMessageId");

				draft.status = "INTERRUPTED";
			});
		},
	});

	const handler = (data: InterruptGenerationPayload) => {
		const transaction = action(data);

		return { transaction };
	};

	return handler;
};

export const useDeleteConversation = () => {
	const callDeleteConversation = useServerFn(deleteConversation);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callDeleteConversation({ data });

			return conversationCollection.utils.awaitTxId(result.transactionId);
		},
		onMutate: (data: DeleteConversationPayload) => {
			conversationCollection.delete(data.conversationId);
		},
	});

	const handler = (data: DeleteConversationPayload) => {
		const transaction = action(data);

		return { transaction };
	};

	return handler;
};

export const useEditConversationTitle = () => {
	const callEditConversationTitle = useServerFn(editConversationTitle);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callEditConversationTitle({ data });

			return conversationCollection.utils.awaitTxId(result.transactionId);
		},
		onMutate: (data: EditConversationTitlePayload) => {
			conversationCollection.update(data.conversationId, (draft) => {
				draft.title = data.title;
			});
		},
	});

	const handler = (data: EditConversationTitlePayload) => {
		const transaction = action(data);

		return { transaction };
	};

	return handler;
};
