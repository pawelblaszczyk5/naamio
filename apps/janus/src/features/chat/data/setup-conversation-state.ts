import { and, createOptimisticAction, eq, queryOnce } from "@tanstack/react-db";
import { Schema } from "effect";

import type { ConversationModel } from "@naamio/schema/domain";

import { assert } from "@naamio/assert";

import {
	conversationsCollection,
	conversationsStateCollection,
	messagesCollection,
} from "#src/features/chat/data/collections.js";
import { markConversationAsAccessed, MarkConversationAsAccessedPayload } from "#src/features/chat/procedures/mod.js";

const encodePayload = Schema.encodeSync(MarkConversationAsAccessedPayload);

const markConversationAsAccessedAction = createOptimisticAction({
	mutationFn: async (data) => {
		const result = await markConversationAsAccessed({ data: encodePayload(data) });

		return conversationsCollection.utils.awaitTxId(result.transactionId);
	},
	onMutate: (data: MarkConversationAsAccessedPayload) => {
		conversationsCollection.update(data.conversationId, (draft) => {
			draft.accessedAt = new Date();
		});
	},
});

export const setupConversationState = async (conversationId: ConversationModel["id"]) => {
	if (conversationsStateCollection.has(conversationId)) {
		return;
	}

	const conversation = await queryOnce((q) =>
		q
			.from({ conversation: conversationsCollection })
			.where(({ conversation }) => eq(conversation.id, conversationId))
			.findOne(),
	);

	if (!conversation) {
		return;
	}

	markConversationAsAccessedAction({ conversationId });

	const newestAgentMessage = await queryOnce((q) =>
		q
			.from({ message: messagesCollection })
			.where(({ message }) => and(eq(message.role, "AGENT"), eq(message.conversationId, conversationId)))
			.orderBy(({ message }) => message.createdAt, "desc")
			.findOne(),
	);

	assert(newestAgentMessage?.role === "AGENT", "Every conversation must have at least one agent message");

	conversationsStateCollection.insert({ activeLeafId: newestAgentMessage.id, id: conversationId });
};
