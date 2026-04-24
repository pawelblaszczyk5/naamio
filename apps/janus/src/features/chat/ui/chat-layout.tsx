import { Trans } from "@lingui/react/macro";
import { useLiveQuery } from "@tanstack/react-db";
import { Link, Outlet } from "@tanstack/react-router";
import { Array } from "effect";

import stylex from "@naamio/stylex";

import { conversationsCollection } from "#src/features/chat/data/collections.js";
import { useLanguage } from "#src/lib/i18n/use-language.js";

const styles = stylex.create({
	main: { inlineSize: "100%", padding: 32 },
	nav: {
		blockSize: "100%",
		borderColor: "#626262",
		borderInlineEndWidth: 1,
		columnGap: 16,
		display: "flex",
		flexDirection: "column",
		inlineSize: 240,
		padding: 32,
		rowGap: 16,
	},
	root: { blockSize: "100dvh", columnGap: 24, display: "flex", rowGap: 24 },
});

export const ChatLayout = () => {
	const language = useLanguage();

	const { data: conversations } = useLiveQuery((q) =>
		q
			.from({ conversation: conversationsCollection })
			.fn.select(({ conversation }) => {
				const lastActivityAt =
					conversation.updatedAt.getTime() >= conversation.accessedAt.getTime() ?
						conversation.updatedAt
					:	conversation.accessedAt;

				return { id: conversation.id, lastActivityAt, title: conversation.title };
			})
			.orderBy(({ $selected }) => $selected.lastActivityAt, "desc"),
	);

	return (
		<div {...stylex.props(styles.root)}>
			<nav {...stylex.props(styles.nav)}>
				<Trans>Hello world!</Trans>
				<Link params={{ language }} to="/{$language}">
					<Trans>Home</Trans>
				</Link>
				<Link to="/app">
					<Trans>App</Trans>
				</Link>
				<Link to="/app/settings">
					<Trans>Settings</Trans>
				</Link>
				<hr />
				{Array.match(conversations, {
					onEmpty: () => (
						<p>
							<Trans>No conversations yet</Trans>
						</p>
					),
					onNonEmpty: (conversations) =>
						conversations.map((conversation) => (
							<Link
								key={conversation.id}
								params={{ conversationId: conversation.id }}
								to="/app/conversation/$conversationId"
							>
								{conversation.title ?? <Trans>Waiting for title...</Trans>}
							</Link>
						)),
				})}
			</nav>
			<main {...stylex.props(styles.main)}>
				<Outlet />
			</main>
		</div>
	);
};
