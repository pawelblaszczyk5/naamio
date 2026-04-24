import { eq, useLiveQuery } from "@tanstack/react-db";
import { Match } from "effect";

import stylex from "@naamio/stylex";

import type { Conversation } from "#src/features/chat/data/collections.js";

import { messagesCollection } from "#src/features/chat/data/collections.js";
import { MessageFromAgent } from "#src/features/chat/ui/messages-list/message-from-agent.js";
import { MessageFromUser } from "#src/features/chat/ui/messages-list/message-from-user.js";

const styles = stylex.create({
	root: { columnGap: 16, display: "flex", flexDirection: "column", overflowY: "auto", rowGap: 16 },
});

export const MessagesList = ({ conversationId }: { conversationId: Conversation["id"] }) => {
	const { data: messages } = useLiveQuery(
		(q) =>
			q
				.from({ message: messagesCollection })
				.where(({ message }) => eq(message.conversationId, conversationId))
				.orderBy(({ message }) => message.createdAt, "asc"),

		[conversationId],
	);

	return (
		<div {...stylex.props(styles.root)}>
			{messages.map((message) =>
				Match.value(message).pipe(
					Match.when({ role: "USER" }, (message) => <MessageFromUser key={message.id} message={message} />),
					Match.when({ role: "AGENT" }, (message) => <MessageFromAgent key={message.id} message={message} />),
					Match.exhaustive,
				),
			)}
		</div>
	);
};
