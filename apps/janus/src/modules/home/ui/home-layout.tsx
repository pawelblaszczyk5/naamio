import { Trans } from "@lingui/react/macro";
import { Link, Outlet, useLoaderData, useParams } from "@tanstack/react-router";

import stylex from "@naamio/stylex";

const styles = stylex.create({
	nav: { display: "flex", gap: 16 },
	root: { display: "flex", flexDirection: "column", gap: 24 },
});

export const HomeLayout = () => {
	const currentLanguage = useParams({ from: "/_home/{$language}", select: (params) => params.language });
	const isLoggedIn = useLoaderData({ from: "/_home/{$language}", select: (loaderData) => loaderData.isLoggedIn });

	return (
		<div {...stylex.props(styles.root)}>
			<nav {...stylex.props(styles.nav)}>
				<Trans>Hello world!</Trans>
				<Link params={{ language: currentLanguage }} to="/{$language}">
					<Trans>Home</Trans>
				</Link>
				{isLoggedIn && (
					<Link to="/app">
						<Trans>App</Trans>
					</Link>
				)}
				{!isLoggedIn && (
					<Link params={{ language: currentLanguage }} to="/{$language}/sign-in">
						<Trans>Sign in</Trans>
					</Link>
				)}
				<Link params={{ language: "en-US" }} to=".">
					<Trans>English</Trans>
				</Link>
				<Link params={{ language: "pl-PL" }} to=".">
					<Trans>Polish</Trans>
				</Link>
			</nav>
			<div>
				<Outlet />
			</div>
		</div>
	);
};
