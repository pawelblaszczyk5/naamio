import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { cleanupSessionData } from "#src/features/auth/data/session.js";
import { cleanupUserData } from "#src/features/user/data/mod.js";
import { routeTree } from "#src/routeTree.gen.js";

export const getRouter = () => {
	const router = createTanStackRouter({ routeTree, scrollRestoration: true });

	if (!router.isServer) {
		// NOTE: That doesn't fully work yet - https://github.com/electric-sql/electric/pull/3732
		router.subscribe("onRendered", (event) => {
			const hasNavigatedOutsideOfApp = Boolean(
				event.fromLocation && event.fromLocation.href.startsWith("/app") && !event.toLocation.href.startsWith("/app"),
			);

			if (hasNavigatedOutsideOfApp) {
				void cleanupSessionData();
				void cleanupUserData();
			}
		});
	}

	return router;
};
