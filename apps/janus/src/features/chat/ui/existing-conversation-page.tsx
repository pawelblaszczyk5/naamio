import { Trans, useLingui } from "@lingui/react/macro";
import { createOptimisticAction, eq, useLiveQuery } from "@tanstack/react-db";
import { Navigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { useId, useRef, useState } from "react";

import stylex from "@naamio/stylex";

import { conversationsCollection, conversationsStateCollection } from "#src/features/chat/data/collections.js";
import { useContinueConversation } from "#src/features/chat/data/conversation-lifecycle.js";
import {
	deleteConversation,
	DeleteConversationPayload,
	editConversationTitle,
	EditConversationTitlePayload,
} from "#src/features/chat/procedures/mod.js";
import { MessagesList } from "#src/features/chat/ui/messages-list/mod.js";

const styles = stylex.create({
	form: { columnGap: 16, display: "flex", flexDirection: "column", inlineSize: 500, rowGap: 16 },
	root: {
		blockSize: "100%",
		columnGap: 32,
		display: "grid",
		gridTemplateRows: "auto minmax(0, 1fr) auto",
		inlineSize: "100%",
		rowGap: 32,
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

const useDeleteConversation = () => {
	const callDeleteConversation = useServerFn(deleteConversation);

	const encodePayload = Schema.encodeSync(DeleteConversationPayload);

	const action = createOptimisticAction({
		mutationFn: async (data, params) => {
			const result = await callDeleteConversation({ data: encodePayload(data) });

			conversationsStateCollection.utils.acceptMutations(params.transaction);

			return conversationsCollection.utils.awaitTxId(result.transactionId);
		},
		onMutate: (data: DeleteConversationPayload) => {
			conversationsCollection.delete(data.conversationId);
			conversationsStateCollection.delete(data.conversationId);
		},
	});

	const handler = (data: DeleteConversationPayload) => {
		const transaction = action(data);

		return { transaction };
	};

	return handler;
};

const useEditConversationTitle = () => {
	const callEditConversationTitle = useServerFn(editConversationTitle);

	const encodePayload = Schema.encodeSync(EditConversationTitlePayload);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callEditConversationTitle({ data: encodePayload(data) });

			return conversationsCollection.utils.awaitTxId(result.transactionId);
		},
		onMutate: (data: EditConversationTitlePayload) => {
			conversationsCollection.update(data.conversationId, (draft) => {
				draft.title = data.title;
				draft.updatedAt = new Date();
			});
		},
	});

	const handler = (data: EditConversationTitlePayload) => {
		const transaction = action(data);

		return { transaction };
	};

	return handler;
};

export const ExistingConversationPage = () => {
	const { t } = useLingui();

	const conversationIdFromParams = useParams({
		from: "/app/_chat/conversation/$conversationId",
		select: (params) => params.conversationId,
	});

	const { data: conversation } = useLiveQuery(
		(q) =>
			q
				.from({ conversation: conversationsCollection })
				.where(({ conversation }) => eq(conversation.id, conversationIdFromParams))
				.findOne(),
		[conversationIdFromParams],
	);

	const { data: conversationState } = useLiveQuery(
		(q) =>
			q
				.from({ conversationState: conversationsStateCollection })
				.where(({ conversationState }) => eq(conversationState.id, conversationIdFromParams))
				.findOne(),
		[conversationIdFromParams],
	);

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
			<MessagesList conversationId={conversation.id} />
			<form
				onSubmit={(event) => {
					event.preventDefault();

					setContent("");
					continueConversation({
						content,
						conversationId: conversation.id,
						previousMessageId: conversationState.activeLeafId,
					});
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
