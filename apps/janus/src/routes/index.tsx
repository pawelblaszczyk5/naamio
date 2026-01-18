import { createFileRoute, redirect } from "@tanstack/react-router";

import { getPreferredLanguage } from "#src/features/home/procedures/mod.js";

export const Route = createFileRoute("/")({
	loader: async () => {
		const preferredLanguage = await getPreferredLanguage();

		throw redirect({ params: { language: preferredLanguage }, to: "/{$language}" });
	},
});
