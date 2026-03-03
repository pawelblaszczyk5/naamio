import { createOptimisticAction } from "@tanstack/react-db";
import { useServerFn } from "@tanstack/react-start";
import { Schema } from "effect";

import { assert } from "@naamio/assert";

import { Conversation, conversationCollection } from "#src/features/chat/data/conversation.js";
import { messagePartCollection, TextMessagePart } from "#src/features/chat/data/message-part.js";
import { AgentMessage, messageCollection, UserMessage } from "#src/features/chat/data/message.js";
import {
	continueConversation,
	ContinueConversationPayload,
	deleteConversation,
	DeleteConversationPayload,
	editConversationTitle,
	EditConversationTitlePayload,
	interruptGeneration,
	InterruptGenerationPayload,
	startConversation,
	StartConversationPayload,
} from "#src/features/chat/procedures/mod.js";
import { generateId } from "#src/lib/id-pool/mod.js";

export const useStartConversation = () => {
	const callStartConversation = useServerFn(startConversation);

	const encodePayload = Schema.encodeSync(StartConversationPayload);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callStartConversation({ data: encodePayload(data) });

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

export const useContinueConversation = () => {
	const callContinueConversation = useServerFn(continueConversation);

	const encodePayload = Schema.encodeSync(ContinueConversationPayload);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callContinueConversation({ data: encodePayload(data) });

			return Promise.all([
				conversationCollection.utils.awaitTxId(result.transactionId),
				messageCollection.utils.awaitTxId(result.transactionId),
				messagePartCollection.utils.awaitTxId(result.transactionId),
			]);
		},
		onMutate: (data: ContinueConversationPayload) => {
			const now = new Date();

			const userMessageInput = data.messages[0];
			const agentMessageInput = data.messages[1];

			messageCollection.insert({
				conversationId: data.conversationId,
				createdAt: now,
				id: userMessageInput.id,
				parentId: userMessageInput.parentId,
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

	const handler = (data: {
		content: string;
		conversationId: Conversation["id"];
		previousMessage: AgentMessage | null;
	}) => {
		const userMessageId = UserMessage.fields.id.makeUnsafe(generateId());
		const userTextMessagePartId = TextMessagePart.fields.id.makeUnsafe(generateId());
		const agentMessageId = AgentMessage.fields.id.makeUnsafe(generateId());

		const transaction = action({
			conversationId: data.conversationId,
			messages: [
				{
					id: userMessageId,
					parentId: data.previousMessage ? data.previousMessage.id : null,
					parts: [{ data: { content: data.content }, id: userTextMessagePartId, type: "TEXT" }],
				},
				{ id: agentMessageId },
			],
		});

		return { transaction };
	};

	return handler;
};

export const useInterruptGeneration = () => {
	const callInterruptGeneration = useServerFn(interruptGeneration);

	const encodePayload = Schema.encodeSync(InterruptGenerationPayload);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callInterruptGeneration({ data: encodePayload(data) });

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

	const encodePayload = Schema.encodeSync(DeleteConversationPayload);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callDeleteConversation({ data: encodePayload(data) });

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

	const encodePayload = Schema.encodeSync(EditConversationTitlePayload);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callEditConversationTitle({ data: encodePayload(data) });

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
