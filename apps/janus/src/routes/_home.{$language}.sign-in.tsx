import { createFileRoute, redirect } from "@tanstack/react-router";

import { checkHasSessionToken, getAuthenticationChallengeMetadata } from "#src/features/home/procedures/mod.js";
import { SignInPage } from "#src/features/home/ui/sign-in-page.js";

export const Route = createFileRoute("/_home/{$language}/sign-in")({
	component: SignInPage,
	loader: async () => {
		const isLoggedIn = await checkHasSessionToken();

		if (isLoggedIn) {
			throw redirect({ replace: true, to: "/app" });
		}

		return getAuthenticationChallengeMetadata();
	},
});
