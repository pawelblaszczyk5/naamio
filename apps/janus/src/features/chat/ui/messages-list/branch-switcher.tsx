import { Trans } from "@lingui/react/macro";
import { eq, useLiveQuery } from "@tanstack/react-db";

import { assert } from "@naamio/assert";

import type { Message } from "#src/features/chat/data/collections.js";

import { conversationsStateCollection, messagesCollection } from "#src/features/chat/data/collections.js";

interface MessageForSearch {
	createdAt: Message["createdAt"];
	id: Message["id"];
	parentId: Message["parentId"];
}

const findNewestLeaf = (messages: Array<MessageForSearch>, startingMessageId: Message["id"]) => {
	const messagesByParentId = new Map<Message["id"], Array<MessageForSearch>>();

	messages.forEach((message) => {
		if (!message.parentId) {
			return;
		}

		const siblings = messagesByParentId.get(message.parentId) ?? [];

		siblings.push(message);
		messagesByParentId.set(message.parentId, siblings);
	});

	let bestLeaf: MessageForSearch | undefined;

	const depthFirstSearch = (message: MessageForSearch) => {
		const children = messagesByParentId.get(message.id);

		if (!children) {
			if (!bestLeaf || message.createdAt.getTime() > bestLeaf.createdAt.getTime()) {
				bestLeaf = message;
			}
			return;
		}

		children.forEach((child) => {
			depthFirstSearch(child);
		});
	};

	const startMessage = messages.find((message) => message.id === startingMessageId);

	assert(startMessage, "Message must exist for each ID");

	depthFirstSearch(startMessage);

	assert(bestLeaf, "There always must be at least one leaf under each message");

	return bestLeaf.id;
};

const useTraverseBranch = (conversationId: Message["conversationId"]) => {
	const { data: allMessages } = useLiveQuery(
		(q) =>
			q
				.from({ message: messagesCollection })
				.where(({ message }) => eq(message.conversationId, conversationId))
				.select(({ message }) => ({ createdAt: message.createdAt, id: message.id, parentId: message.parentId })),
		[conversationId],
	);

	const handler = (messageIdToIncludeInNewTree: Message["id"]) => {
		const newLeafMessageId = findNewestLeaf(allMessages, messageIdToIncludeInNewTree);

		conversationsStateCollection.update(conversationId, (draft) => {
			draft.activeLeafId = newLeafMessageId;
		});
	};

	return handler;
};

export const BranchSwitcher = ({
	conversationId,
	messageId,
	parentId,
}: {
	conversationId: Message["conversationId"];
	messageId: Message["id"];
	parentId: Message["parentId"];
}) => {
	const { data: family } = useLiveQuery(
		(q) =>
			q
				.from({ message: messagesCollection })
				.fn.where(({ message }) => message.parentId === parentId && message.conversationId === conversationId)
				.orderBy(({ message }) => message.createdAt, "asc")
				.select(({ message }) => ({ id: message.id })),
		[parentId, conversationId],
	);

	const traverseBranch = useTraverseBranch(conversationId);

	if (family.length <= 1) {
		return null;
	}

	const currentMessageIndex = family.findIndex((message) => message.id === messageId);

	const isFirst = currentMessageIndex === 0;
	const isLast = currentMessageIndex === family.length - 1;

	return (
		<div>
			<button
				onClick={() => {
					const messageToIncludeInNewTree = family.at(currentMessageIndex - 1);

					assert(messageToIncludeInNewTree, "If this button is enabled this message must exist");

					traverseBranch(messageToIncludeInNewTree.id);
				}}
				disabled={isFirst}
				type="button"
			>
				<Trans>Previous</Trans>
			</button>{" "}
			{currentMessageIndex + 1}/{family.length}{" "}
			<button
				onClick={() => {
					const messageToIncludeInNewTree = family.at(currentMessageIndex + 1);

					assert(messageToIncludeInNewTree, "If this button is enabled this message must exist");

					traverseBranch(messageToIncludeInNewTree.id);
				}}
				disabled={isLast}
				type="button"
			>
				<Trans>Next</Trans>
			</button>
		</div>
	);
};
