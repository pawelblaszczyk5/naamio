import { createOptimisticAction } from "@tanstack/react-db";
import { useServerFn } from "@tanstack/react-start";
import { Schema } from "effect";

import { assert } from "@naamio/assert";

import {
	AgentMessage,
	Conversation,
	conversationsCollection,
	conversationsStateCollection,
	messagePartsCollection,
	messagesCollection,
	TextMessagePart,
	UserMessage,
} from "#src/features/chat/data/collections.js";
import {
	continueConversation,
	ContinueConversationPayload,
	interruptGeneration,
	InterruptGenerationPayload,
	regenerateAnswer,
	RegenerateAnswerPayload,
	startConversation,
	StartConversationPayload,
} from "#src/features/chat/procedures/mod.js";
import { generateId } from "#src/lib/id-pool/mod.js";

export const useStartConversation = () => {
	const callStartConversation = useServerFn(startConversation);

	const encodePayload = Schema.encodeSync(StartConversationPayload);

	const action = createOptimisticAction({
		mutationFn: async (data, params) => {
			const result = await callStartConversation({ data: encodePayload(data) });

			conversationsStateCollection.utils.acceptMutations(params.transaction);

			return Promise.all([
				conversationsCollection.utils.awaitTxId(result.transactionId),
				messagesCollection.utils.awaitTxId(result.transactionId),
				messagePartsCollection.utils.awaitTxId(result.transactionId),
			]);
		},
		onMutate: (data: StartConversationPayload) => {
			const now = new Date();

			conversationsCollection.insert({
				accessedAt: now,
				createdAt: now,
				id: data.conversationId,
				title: null,
				updatedAt: now,
			});

			const userMessageInput = data.messages[0];
			const agentMessageInput = data.messages[1];

			messagesCollection.insert({
				conversationId: data.conversationId,
				createdAt: now,
				id: userMessageInput.id,
				parentId: null,
				role: "USER",
			});

			messagesCollection.insert({
				conversationId: data.conversationId,
				createdAt: now,
				id: agentMessageInput.id,
				metadata: null,
				parentId: userMessageInput.id,
				role: "AGENT",
				status: "IN_PROGRESS",
			});

			userMessageInput.parts.forEach((part) => {
				messagePartsCollection.insert({
					createdAt: now,
					data: part.data,
					id: part.id,
					messageId: userMessageInput.id,
					type: "TEXT",
				});
			});

			conversationsStateCollection.insert({ activeLeafId: agentMessageInput.id, id: data.conversationId });
		},
	});

	const handler = (data: { content: string }) => {
		const conversationId = Conversation.fields.id.make(generateId());
		const userMessageId = UserMessage.fields.id.make(generateId());
		const userTextMessagePartId = TextMessagePart.fields.id.make(generateId());
		const agentMessageId = AgentMessage.fields.id.make(generateId());

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
		mutationFn: async (data, params) => {
			const result = await callContinueConversation({ data: encodePayload(data) });

			conversationsStateCollection.utils.acceptMutations(params.transaction);

			return Promise.all([
				conversationsCollection.utils.awaitTxId(result.transactionId),
				messagesCollection.utils.awaitTxId(result.transactionId),
				messagePartsCollection.utils.awaitTxId(result.transactionId),
			]);
		},
		onMutate: (data: ContinueConversationPayload) => {
			const now = new Date();

			const userMessageInput = data.messages[0];
			const agentMessageInput = data.messages[1];

			conversationsCollection.update(data.conversationId, (draft) => {
				draft.updatedAt = now;
			});

			messagesCollection.insert({
				conversationId: data.conversationId,
				createdAt: now,
				id: userMessageInput.id,
				parentId: userMessageInput.parentId,
				role: "USER",
			});

			messagesCollection.insert({
				conversationId: data.conversationId,
				createdAt: now,
				id: agentMessageInput.id,
				metadata: null,
				parentId: userMessageInput.id,
				role: "AGENT",
				status: "IN_PROGRESS",
			});

			userMessageInput.parts.forEach((part) => {
				messagePartsCollection.insert({
					createdAt: now,
					data: part.data,
					id: part.id,
					messageId: userMessageInput.id,
					type: "TEXT",
				});
			});

			conversationsStateCollection.update(data.conversationId, (draft) => {
				draft.activeLeafId = agentMessageInput.id;
			});
		},
	});

	const handler = (data: {
		content: string;
		conversationId: Conversation["id"];
		previousMessageId: AgentMessage["id"] | null;
	}) => {
		const userMessageId = UserMessage.fields.id.make(generateId());
		const userTextMessagePartId = TextMessagePart.fields.id.make(generateId());
		const agentMessageId = AgentMessage.fields.id.make(generateId());

		const transaction = action({
			conversationId: data.conversationId,
			messages: [
				{
					id: userMessageId,
					parentId: data.previousMessageId,
					parts: [{ data: { content: data.content }, id: userTextMessagePartId, type: "TEXT" }],
				},
				{ id: agentMessageId },
			],
		});

		return { transaction };
	};

	return handler;
};

export const useRegenerateAnswer = () => {
	const callRegenerateAnswer = useServerFn(regenerateAnswer);

	const encodePayload = Schema.encodeSync(RegenerateAnswerPayload);

	const action = createOptimisticAction({
		mutationFn: async (data, params) => {
			const result = await callRegenerateAnswer({ data: encodePayload(data) });

			conversationsStateCollection.utils.acceptMutations(params.transaction);

			return Promise.all([
				conversationsCollection.utils.awaitTxId(result.transactionId),
				messagesCollection.utils.awaitTxId(result.transactionId),
			]);
		},
		onMutate: (data: RegenerateAnswerPayload) => {
			const now = new Date();

			conversationsCollection.update(data.conversationId, (draft) => {
				draft.updatedAt = now;
			});

			messagesCollection.insert({
				conversationId: data.conversationId,
				createdAt: now,
				id: data.message.id,
				metadata: null,
				parentId: data.message.parentId,
				role: "AGENT",
				status: "IN_PROGRESS",
			});

			conversationsStateCollection.update(data.conversationId, (draft) => {
				draft.activeLeafId = data.message.id;
			});
		},
	});

	const handler = (data: { messageToRegenerate: AgentMessage }) => {
		const regeneratedMessageId = AgentMessage.fields.id.make(generateId());

		const transaction = action({
			conversationId: data.messageToRegenerate.conversationId,
			message: { id: regeneratedMessageId, parentId: data.messageToRegenerate.parentId },
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

			return messagesCollection.utils.awaitTxId(result.transactionId);
		},
		onMutate: (data: InterruptGenerationPayload) => {
			messagesCollection.update(data.messageId, (draft) => {
				assert(draft.role === "AGENT", "Agent message should always be tied to AgentMessageId");

				draft.status = "INTERRUPTED";
			});
		},
	});

	const handler = (data: { messageToInterrupt: AgentMessage }) => {
		const transaction = action({
			conversationId: data.messageToInterrupt.conversationId,
			messageId: data.messageToInterrupt.id,
		});

		return { transaction };
	};

	return handler;
};
