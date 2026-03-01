import { Trans } from "@lingui/react/macro";
import { Navigate, useParams } from "@tanstack/react-router";
import { Match } from "effect";

import stylex from "@naamio/stylex";

import type { ReasoningMessagePart, TextMessagePart } from "#src/features/chat/data/message-part.js";
import type { AgentMessage, UserMessage } from "#src/features/chat/data/message.js";

import {
	useAgentMessagePartsByMessageId,
	useConversationById,
	useInflightChunksByMessagePartId,
	useMessagesByConversationId,
	useUserMessagePartsByMessageId,
} from "#src/features/chat/data/queries.js";

const styles = stylex.create({
	messagePartsList: { display: "flex", flexDirection: "column", gap: 8 },
	messagesList: { display: "flex", flexDirection: "column", gap: 16 },
	root: { display: "flex", flexDirection: "column", gap: 32 },
});

const TextMessagePartContent = ({ messagePart }: { messagePart: TextMessagePart }) => {
	const existingContent = messagePart.data.content;
	const inflightChunks = useInflightChunksByMessagePartId(messagePart.id);

	const contentToRender = existingContent ?? inflightChunks.map((inflightChunk) => inflightChunk.content).join("");

	return (
		<p>
			<Trans>Content</Trans>
			<br />
			{contentToRender}
		</p>
	);
};

const ReasoningMessagePartContent = ({ messagePart }: { messagePart: ReasoningMessagePart }) => {
	const existingContent = messagePart.data.content;
	const inflightChunks = useInflightChunksByMessagePartId(messagePart.id);

	const contentToRender = existingContent ?? inflightChunks.map((inflightChunk) => inflightChunk.content).join("");

	return (
		<p>
			<Trans>Reasoning...</Trans>
			<br />
			{contentToRender}
		</p>
	);
};

const MessageFromAgent = ({ message }: { message: AgentMessage }) => {
	const messageParts = useAgentMessagePartsByMessageId(message.id);

	return (
		<div>
			<p>
				<Trans>Message from agent</Trans>
			</p>
			<div {...stylex.props(styles.messagePartsList)}>
				{messageParts.map((messagePart) =>
					Match.value(messagePart).pipe(
						Match.when({ type: "REASONING" }, (messagePart) => (
							<ReasoningMessagePartContent key={messagePart.id} messagePart={messagePart} />
						)),
						Match.when({ type: "TEXT" }, (messagePart) => (
							<TextMessagePartContent key={messagePart.id} messagePart={messagePart} />
						)),
						Match.exhaustive,
					),
				)}
			</div>
		</div>
	);
};

const MessageFromUser = ({ message }: { message: UserMessage }) => {
	const messageParts = useUserMessagePartsByMessageId(message.id);

	return (
		<div>
			<p>
				<Trans>Message from user</Trans>
			</p>
			<div {...stylex.props(styles.messagePartsList)}>
				{messageParts.map((messagePart) =>
					Match.value(messagePart).pipe(
						Match.when({ type: "TEXT" }, (messagePart) => (
							<TextMessagePartContent key={messagePart.id} messagePart={messagePart} />
						)),
						Match.exhaustive,
					),
				)}
			</div>
		</div>
	);
};

export const ExistingConversationPage = () => {
	const conversationId = useParams({
		from: "/app/_chat/conversation/$conversationId",
		select: (params) => params.conversationId,
	});

	const conversation = useConversationById(conversationId);
	const messages = useMessagesByConversationId(conversationId);

	if (!conversation) {
		return <Navigate to="/app" />;
	}

	return (
		<div {...stylex.props(styles.root)}>
			<h1>
				{conversation.title ?
					<Trans>Conversation "{{ title: conversation.title }}"</Trans>
				:	<Trans>Conversation without title (yet)</Trans>}
			</h1>
			<div {...stylex.props(styles.messagesList)}>
				{messages.map((message) => {
					if (message.role === "AGENT") {
						return <MessageFromAgent key={message.id} message={message} />;
					}

					return <MessageFromUser key={message.id} message={message} />;
				})}
			</div>
		</div>
	);
};
