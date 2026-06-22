import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { NotFound } from "#src/components/not-found.js";
import { routeTree } from "#src/routeTree.gen.js";

export const getRouter = () =>
	createTanStackRouter({
		defaultNotFoundComponent: NotFound,
		defaultPreload: "intent",
		defaultStaleTime: 60_000,
		routeTree,
		scrollRestoration: true,
	});
