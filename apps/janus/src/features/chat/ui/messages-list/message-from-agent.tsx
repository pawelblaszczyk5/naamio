import { Trans } from "@lingui/react/macro";
import { and, eq, inArray, useLiveQuery } from "@tanstack/react-db";
import { Match } from "effect";

import stylex from "@naamio/stylex";

import type { AgentMessage, MessagePart } from "#src/features/chat/data/collections.js";

import { messagePartsCollection } from "#src/features/chat/data/collections.js";
import { useInterruptGeneration, useRegenerateAnswer } from "#src/features/chat/data/conversation-lifecycle.js";
import { MessagePartContent } from "#src/features/chat/ui/messages-list/message-part-content.js";

const useAgentMessagePartsByMessageId = (messageId: AgentMessage["id"]) => {
	const agentMessagePartTypes = ["TEXT", "REASONING"] satisfies Array<MessagePart["type"]>;

	const messageParts = useLiveQuery(
		(q) =>
			q
				.from({ messagePart: messagePartsCollection })
				.where(({ messagePart }) =>
					and(eq(messagePart.messageId, messageId), inArray(messagePart.type, agentMessagePartTypes)),
				)
				.orderBy(({ messagePart }) => messagePart.createdAt, "asc"),
		[messageId],
	).data;

	return messageParts as ReadonlyArray<Extract<MessagePart, { type: (typeof agentMessagePartTypes)[number] }>>;
};

const styles = stylex.create({
	messagePartsList: { columnGap: 8, display: "flex", flexDirection: "column", rowGap: 8 },
});

export const MessageFromAgent = ({ message }: { message: AgentMessage }) => {
	const messageParts = useAgentMessagePartsByMessageId(message.id);

	const interruptGeneration = useInterruptGeneration();
	const regenerateAnswer = useRegenerateAnswer();

	const regenerateButton = (
		<button
			onClick={() => {
				regenerateAnswer({ messageToRegenerate: message });
			}}
			type="button"
		>
			<Trans>Regenerate</Trans>
		</button>
	);

	return (
		<div>
			<p>
				<Trans>Message from agent</Trans>{" "}
				{Match.value(message.status).pipe(
					Match.when("ERROR", () => (
						<span>
							<Trans>Failed during generation</Trans> {regenerateButton}
						</span>
					)),
					Match.when("FINISHED", () => (
						<span>
							<Trans>Correctly finished</Trans> {regenerateButton}
						</span>
					)),
					Match.when("IN_PROGRESS", () => (
						<span>
							<Trans>Generation in progress</Trans>{" "}
							<button
								onClick={() => {
									interruptGeneration({ messageToInterrupt: message });
								}}
								type="button"
							>
								<Trans>Interrupt</Trans>
							</button>
						</span>
					)),
					Match.when("INTERRUPTED", () => (
						<span>
							<Trans>Generation interrupted</Trans> {regenerateButton}
						</span>
					)),
					Match.exhaustive,
				)}
			</p>
			<div {...stylex.props(styles.messagePartsList)}>
				{messageParts.map((messagePart) => (
					<MessagePartContent key={messagePart.id} messagePart={messagePart} />
				))}
			</div>
		</div>
	);
};
