import { Trans } from "@lingui/react/macro";
import { Link, Outlet } from "@tanstack/react-router";

import stylex from "@naamio/stylex";

import { useSessionVerificationPoller } from "#src/features/auth/data/session-cache.js";
import { useCurrentLanguage } from "#src/lib/shell/use-current-language.js";

const styles = stylex.create({
	nav: { display: "flex", gap: 16 },
	root: { display: "flex", flexDirection: "column", gap: 24 },
});

export const AppLayout = () => {
	const currentLanguage = useCurrentLanguage();

	useSessionVerificationPoller();

	return (
		<div {...stylex.props(styles.root)}>
			<nav {...stylex.props(styles.nav)}>
				<Trans>Hello world!</Trans>
				<Link params={{ language: currentLanguage }} to="/{$language}">
					<Trans>Home</Trans>
				</Link>
				<Link to="/app">
					<Trans>App</Trans>
				</Link>
			</nav>
			<div>
				<Outlet />
			</div>
		</div>
	);
};
