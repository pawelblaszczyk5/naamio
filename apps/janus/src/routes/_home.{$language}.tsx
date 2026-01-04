import { createFileRoute, notFound } from "@tanstack/react-router";

import { HomeLayout } from "#src/modules/home/ui/home-layout.js";
import { HomeNotFound } from "#src/modules/home/ui/home-not-found.js";
import { checkHasSessionToken } from "#src/modules/session/procedures.js";

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
