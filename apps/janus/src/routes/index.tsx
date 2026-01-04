import { createFileRoute, redirect } from "@tanstack/react-router";

import { getPreferredLanguage } from "#src/modules/home/procedures.js";

export const Route = createFileRoute("/")({
	loader: async () => {
		const preferredLanguage = await getPreferredLanguage();

		throw redirect({ params: { language: preferredLanguage }, to: "/{$language}" });
	},
});
