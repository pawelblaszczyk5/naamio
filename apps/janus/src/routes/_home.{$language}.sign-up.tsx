import { createFileRoute, redirect } from "@tanstack/react-router";

import { checkHasSessionToken } from "#src/features/home/procedures/mod.js";
import { SignUpPage } from "#src/features/home/ui/sign-up-page.js";

export const Route = createFileRoute("/_home/{$language}/sign-up")({
	component: SignUpPage,
	loader: async () => {
		const isLoggedIn = await checkHasSessionToken();

		if (isLoggedIn) {
			throw redirect({ replace: true, to: "/app" });
		}
	},
});
