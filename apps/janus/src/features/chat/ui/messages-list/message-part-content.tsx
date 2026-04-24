import { Trans } from "@lingui/react/macro";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Match } from "effect";

import type {
	InflightChunk,
	MessagePart,
	ReasoningMessagePart,
	TextMessagePart,
} from "#src/features/chat/data/collections.js";

import { inflightChunksCollection } from "#src/features/chat/data/collections.js";

const useInflightChunksByMessagePartId = (messagePartId: InflightChunk["messagePartId"]) =>
	useLiveQuery(
		(q) =>
			q
				.from({ inflightChunk: inflightChunksCollection })
				.where(({ inflightChunk }) => eq(inflightChunk.messagePartId, messagePartId))
				.orderBy(({ inflightChunk }) => inflightChunk.sequence, "asc"),
		[messagePartId],
	).data;

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

export const MessagePartContent = ({ messagePart }: { messagePart: MessagePart }) =>
	Match.value(messagePart).pipe(
		Match.when({ type: "TEXT" }, (messagePart) => <TextMessagePartContent messagePart={messagePart} />),
		Match.when({ type: "REASONING" }, (messagePart) => <ReasoningMessagePartContent messagePart={messagePart} />),
		Match.exhaustive,
	);
