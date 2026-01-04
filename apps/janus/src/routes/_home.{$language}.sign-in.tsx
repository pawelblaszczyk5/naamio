import { createFileRoute, redirect } from "@tanstack/react-router";

import { SignInPage } from "#src/modules/home/ui/sign-in-page.js";
import { checkHasSessionToken, getAuthenticationChallengeMetadata } from "#src/modules/session/procedures.js";

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
