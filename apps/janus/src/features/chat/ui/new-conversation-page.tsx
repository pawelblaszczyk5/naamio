import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { useId, useRef, useState } from "react";

import stylex from "@naamio/stylex";

import { useStartConversation } from "#src/features/chat/data/conversation-lifecycle.js";

const styles = stylex.create({
	form: { columnGap: 16, display: "flex", flexDirection: "column", rowGap: 16 },
	root: { columnGap: 32, display: "flex", flexDirection: "column", rowGap: 32 },
	textarea: {
		borderColor: "black",
		borderStyle: "solid",
		borderWidth: 1,
		inlineSize: 500,
		paddingBlock: 8,
		paddingInline: 12,
		resize: "none",
	},
});

export const NewConversationPage = () => {
	const startConversation = useStartConversation();

	const navigate = useNavigate();

	const [content, setContent] = useState("");

	const formRef = useRef<HTMLFormElement>(null);

	const id = useId();

	const contentFieldId = `content-field-${id}`;

	return (
		<div {...stylex.props(styles.root)}>
			<h1>
				<Trans>Chat page</Trans>
			</h1>
			<form
				onSubmit={(event) => {
					event.preventDefault();

					const result = startConversation({ content });

					void navigate({ params: { conversationId: result.conversationId }, to: "/app/conversation/$conversationId" });
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
