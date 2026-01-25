import { createFileRoute, notFound } from "@tanstack/react-router";

import { checkHasSessionToken } from "#src/features/auth/procedures/mod.js";
import { HomeLayout } from "#src/features/home/ui/home-layout.js";
import { HomeNotFound } from "#src/features/home/ui/home-not-found.js";

export const Route = createFileRoute("/_home/{$language}")({
	component: HomeLayout,
	loader: async () => {
		const isLoggedIn = await checkHasSessionToken();

		return { isLoggedIn };
	},
	notFoundComponent: HomeNotFound,
	params: {
		parse: (rawParams) => {
			const language = rawParams.language;

			if (language === "en") {
				return { language: "en-US" as const };
			}

			if (language === "pl") {
				return { language: "pl-PL" as const };
			}

			throw notFound();
		},
		stringify: (params) => {
			const language = params.language;

			if (language === "pl-PL") {
				return { language: "pl" as const };
			}

			return { language: "en" as const };
		},
	},
});
