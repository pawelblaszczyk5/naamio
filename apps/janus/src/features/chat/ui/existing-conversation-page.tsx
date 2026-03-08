import { Trans, useLingui } from "@lingui/react/macro";
import { Navigate, useParams } from "@tanstack/react-router";
import { Match } from "effect";
import { useId, useRef, useState } from "react";

import { assert } from "@naamio/assert";
import stylex from "@naamio/stylex";

import type { ReasoningMessagePart, TextMessagePart } from "#src/features/chat/data/message-part.js";
import type { AgentMessage, UserMessage } from "#src/features/chat/data/message.js";

import {
	useContinueConversation,
	useDeleteConversation,
	useEditConversationTitle,
	useInterruptGeneration,
} from "#src/features/chat/data/mutations.js";
import {
	useAgentMessagePartsByMessageId,
	useConversationById,
	useConversationStateById,
	useInflightChunksByMessagePartId,
	useMessagesByConversationId,
	useUserMessagePartsByMessageId,
} from "#src/features/chat/data/queries.js";

const styles = stylex.create({
	form: { display: "flex", flexDirection: "column", gap: 16, inlineSize: 500 },
	messagePartsList: { display: "flex", flexDirection: "column", gap: 8 },
	messagesList: { display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" },
	root: {
		blockSize: "100%",
		display: "grid",
		gap: 32,
		gridTemplateRows: "auto minmax(0, 1fr) auto",
		inlineSize: "100%",
	},
	textarea: {
		borderColor: "black",
		borderStyle: "solid",
		borderWidth: 1,
		inlineSize: "100%",
		paddingBlock: 8,
		paddingInline: 12,
		resize: "none",
	},
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

	const interruptGeneration = useInterruptGeneration();

	return (
		<div>
			<p>
				<Trans>Message from agent</Trans>{" "}
				{Match.value(message.status).pipe(
					Match.when("ERROR", () => <Trans>Failed during generation</Trans>),
					Match.when("FINISHED", () => <Trans>Correctly finished</Trans>),
					Match.when("IN_PROGRESS", () => (
						<span>
							<Trans>Generation in progress</Trans>{" "}
							<button
								onClick={() => {
									interruptGeneration({ conversationId: message.conversationId, messageId: message.id });
								}}
								type="button"
							>
								<Trans>Interrupt</Trans>
							</button>
						</span>
					)),
					Match.when("INTERRUPTED", () => <Trans>Generation interrupted</Trans>),
					Match.exhaustive,
				)}
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
	const { t } = useLingui();
	const conversationIdFromParams = useParams({
		from: "/app/_chat/conversation/$conversationId",
		select: (params) => params.conversationId,
	});

	const conversation = useConversationById(conversationIdFromParams);
	const messages = useMessagesByConversationId(conversationIdFromParams);
	const conversationState = useConversationStateById(conversationIdFromParams);

	const deleteConversation = useDeleteConversation();
	const editConversationTitle = useEditConversationTitle();
	const continueConversation = useContinueConversation();

	const [content, setContent] = useState("");

	const formRef = useRef<HTMLFormElement>(null);

	const id = useId();

	const contentFieldId = `content-field-${id}`;

	if (!conversation || !conversationState) {
		return <Navigate to="/app" />;
	}

	return (
		<div {...stylex.props(styles.root)}>
			<h1>
				{conversation.title ?
					<Trans>Conversation "{{ title: conversation.title }}"</Trans>
				:	<Trans>Conversation without title (yet)</Trans>}{" "}
				<button
					onClick={() => {
						// eslint-disable-next-line no-alert -- temporary until real UI
						const newTitle = globalThis.prompt(t`New title for conversation`);

						if (!newTitle) {
							return;
						}

						editConversationTitle({ conversationId: conversation.id, title: newTitle });
					}}
					type="button"
				>
					Edit title
				</button>{" "}
				<button
					onClick={() => {
						deleteConversation({ conversationId: conversation.id });
					}}
					type="button"
				>
					Delete conversation
				</button>
			</h1>
			<div {...stylex.props(styles.messagesList)}>
				{messages.map((message) => {
					if (message.role === "AGENT") {
						return <MessageFromAgent key={message.id} message={message} />;
					}

					return <MessageFromUser key={message.id} message={message} />;
				})}
			</div>
			<form
				onSubmit={(event) => {
					event.preventDefault();

					const message = messages.at(-1);

					assert(message, "At least one message must always exist");
					assert(message.role === "AGENT", "Last message must always be from agent");

					if (message.status === "IN_PROGRESS") {
						return;
					}

					setContent("");
					continueConversation({ content, conversationId: conversation.id, previousMessage: message });
				}}
				ref={formRef}
				{...stylex.props(styles.form)}
			>
				<label htmlFor={contentFieldId}>
					<Trans>Message content</Trans>
				</label>
				<textarea
					onChange={(event) => {
						setContent(event.currentTarget.value);
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
							event.preventDefault();
							formRef.current?.requestSubmit();
						}
					}}
					id={contentFieldId}
					rows={4}
					value={content}
					required
					{...stylex.props(styles.textarea)}
				/>
				<button type="submit">
					<Trans>Send</Trans>
				</button>
			</form>
		</div>
	);
};
