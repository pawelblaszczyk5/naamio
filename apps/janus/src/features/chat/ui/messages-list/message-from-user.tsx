import { Trans, useLingui } from "@lingui/react/macro";
import { and, eq, inArray, useLiveQuery } from "@tanstack/react-db";

import stylex from "@naamio/stylex";

import type { MessagePart, UserMessage } from "#src/features/chat/data/collections.js";

import { messagePartsCollection } from "#src/features/chat/data/collections.js";
import { useContinueConversation } from "#src/features/chat/data/conversation-lifecycle.js";
import { BranchSwitcher } from "#src/features/chat/ui/messages-list/branch-switcher.js";
import { MessagePartContent } from "#src/features/chat/ui/messages-list/message-part-content.js";

const useUserMessagePartsByMessageId = (messageId: UserMessage["id"]) => {
	const userMessagePartTypes = ["TEXT"] satisfies Array<MessagePart["type"]>;

	const messageParts = useLiveQuery(
		(q) =>
			q
				.from({ messagePart: messagePartsCollection })
				.where(({ messagePart }) =>
					and(eq(messagePart.messageId, messageId), inArray(messagePart.type, userMessagePartTypes)),
				)
				.orderBy(({ messagePart }) => messagePart.createdAt, "asc"),
		[messageId],
	).data;

	return messageParts as ReadonlyArray<Extract<MessagePart, { type: (typeof userMessagePartTypes)[number] }>>;
};

const styles = stylex.create({
	messagePartsList: { columnGap: 8, display: "flex", flexDirection: "column", rowGap: 8 },
});

export const MessageFromUser = ({ message }: { message: UserMessage }) => {
	const { t } = useLingui();

	const messageParts = useUserMessagePartsByMessageId(message.id);

	const continueConversation = useContinueConversation();

	return (
		<div>
			<p>
				<Trans>Message from user</Trans>{" "}
				<button
					onClick={() => {
						// eslint-disable-next-line no-alert -- temporary until real UI
						const newContent = globalThis.prompt(t`New content for message`);

						if (!newContent) {
							return;
						}

						continueConversation({
							content: newContent,
							conversationId: message.conversationId,
							previousMessageId: message.parentId,
						});
					}}
					type="button"
				>
					<Trans>Edit message</Trans>
				</button>
			</p>
			<div {...stylex.props(styles.messagePartsList)}>
				{messageParts.map((messagePart) => (
					<MessagePartContent key={messagePart.id} messagePart={messagePart} />
				))}
			</div>
			<BranchSwitcher conversationId={message.conversationId} messageId={message.id} parentId={message.parentId} />
		</div>
	);
};
