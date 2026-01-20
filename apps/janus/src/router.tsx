import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { routeTree } from "#src/routeTree.gen.js";

export const getRouter = () => {
	const router = createTanStackRouter({ routeTree, scrollRestoration: true });

	return router;
};
