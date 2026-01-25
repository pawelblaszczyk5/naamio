import { Trans } from "@lingui/react/macro";
import { Link, Outlet } from "@tanstack/react-router";

import stylex from "@naamio/stylex";

import { useSessionVerificationPoller } from "#src/features/user/data/session-verification.js";
import { useLanguage } from "#src/lib/shell/use-language.js";

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

export const AppLayout = () => {
	const language = useLanguage();

	useSessionVerificationPoller();

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
			</nav>
			<main {...stylex.props(styles.main)}>
				<Outlet />
			</main>
		</div>
	);
};
