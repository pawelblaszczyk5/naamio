import { Trans } from "@lingui/react/macro";
import { Link, Outlet } from "@tanstack/react-router";

import stylex from "@naamio/stylex";

import { useCurrentLanguage } from "#src/modules/shell/use-current-language.js";

const styles = stylex.create({
	nav: { display: "flex", gap: 16 },
	root: { display: "flex", flexDirection: "column", gap: 24 },
});

export const AppLayout = () => {
	const currentLanguage = useCurrentLanguage();

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
				<Link to="/app/example">
					<Trans>App example</Trans>
				</Link>
			</nav>
			<div>
				<Outlet />
			</div>
		</div>
	);
};
