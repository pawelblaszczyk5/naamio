import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

import { appName, gitConfig } from "#src/lib/shared.js";

export const baseOptions = () =>
	({
		githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
		nav: { title: appName },
	}) satisfies BaseLayoutProps;
