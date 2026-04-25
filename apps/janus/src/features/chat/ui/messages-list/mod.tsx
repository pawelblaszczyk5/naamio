import { eq, useLiveQuery } from "@tanstack/react-db";
import { Match } from "effect";

import { assert } from "@naamio/assert";
import stylex from "@naamio/stylex";

import type { Conversation, Message } from "#src/features/chat/data/collections.js";

import { conversationsStateCollection, messagesCollection } from "#src/features/chat/data/collections.js";
import { MessageFromAgent } from "#src/features/chat/ui/messages-list/message-from-agent.js";
import { MessageFromUser } from "#src/features/chat/ui/messages-list/message-from-user.js";

const styles = stylex.create({
	root: { columnGap: 16, display: "flex", flexDirection: "column", overflowY: "auto", rowGap: 16 },
});

export const MessagesList = ({ conversationId }: { conversationId: Conversation["id"] }) => {
	const { state: messagesById } = useLiveQuery(
		(q) =>
			q
				.from({ message: messagesCollection })
				.where(({ message }) => eq(message.conversationId, conversationId))
				.orderBy(({ message }) => message.createdAt, "asc"),
		[conversationId],
	);

	const { data: conversationState } = useLiveQuery(
		(q) =>
			q
				.from({ conversationState: conversationsStateCollection })
				.where(({ conversationState }) => eq(conversationState.id, conversationId))
				.findOne(),
		[conversationId],
	);

	assert(conversationState, "Conversation state must exist for each conversation at any given point");

	const messagesChain: Array<Message> = [];

	let message: Message | undefined = messagesById.get(conversationState.activeLeafId);

	while (message) {
		messagesChain.unshift(message);

		message = message.parentId ? messagesById.get(message.parentId) : undefined;
	}

	return (
		<div {...stylex.props(styles.root)}>
			{messagesChain.map((message) =>
				Match.value(message).pipe(
					Match.when({ role: "USER" }, (message) => <MessageFromUser key={message.id} message={message} />),
					Match.when({ role: "AGENT" }, (message) => <MessageFromAgent key={message.id} message={message} />),
					Match.exhaustive,
				),
			)}
		</div>
	);
};
