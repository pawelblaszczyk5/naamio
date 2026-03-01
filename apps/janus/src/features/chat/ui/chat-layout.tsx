import { Trans } from "@lingui/react/macro";
import { Link, Outlet } from "@tanstack/react-router";
import { Array } from "effect";

import stylex from "@naamio/stylex";

import { useAvailableConversations } from "#src/features/chat/data/queries.js";
import { useLanguage } from "#src/lib/i18n/use-language.js";

const styles = stylex.create({
	main: { padding: 32 },
	nav: {
		blockSize: "100%",
		borderColor: "#626262",
		borderInlineEndWidth: 1,
		display: "flex",
		flexDirection: "column",
		gap: 16,
		inlineSize: 240,
		padding: 32,
	},
	root: { blockSize: "100dvh", display: "flex", gap: 24 },
});

export const ChatLayout = () => {
	const language = useLanguage();
	const conversations = useAvailableConversations();

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
