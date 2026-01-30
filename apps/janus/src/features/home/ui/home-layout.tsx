import { Trans } from "@lingui/react/macro";
import { Link, Outlet, useLoaderData } from "@tanstack/react-router";

import stylex from "@naamio/stylex";

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

export const HomeLayout = () => {
	const language = useLanguage();
	const isLoggedIn = useLoaderData({ from: "/_home/{$language}", select: (loaderData) => loaderData.isLoggedIn });

	return (
		<div {...stylex.props(styles.root)}>
			<nav {...stylex.props(styles.nav)}>
				<Trans>Hello world!</Trans>
				<Link params={{ language }} to="/{$language}">
					<Trans>Home</Trans>
				</Link>
				{isLoggedIn && (
					<Link to="/app">
						<Trans>App</Trans>
					</Link>
				)}
				{!isLoggedIn && (
					<>
						<Link params={{ language }} to="/{$language}/sign-in">
							<Trans>Sign in</Trans>
						</Link>
						<Link params={{ language }} to="/{$language}/sign-up">
							<Trans>Sign up</Trans>
						</Link>
					</>
				)}
				<Link params={{ language: "en-US" }} to=".">
					<Trans>English</Trans>
				</Link>
				<Link params={{ language: "pl-PL" }} to=".">
					<Trans>Polish</Trans>
				</Link>
			</nav>
			<main {...stylex.props(styles.main)}>
				<Outlet />
			</main>
		</div>
	);
};
