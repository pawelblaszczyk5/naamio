import { useMatch } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

import type { UserModel } from "@naamio/schema/domain";

import { usersCollection } from "#src/features/user/data/collections.js";

export const useUserLanguageSsrSafe = () => {
	const language = useSyncExternalStore(
		(callback) => {
			let subscription: null | ReturnType<(typeof usersCollection)["subscribeChanges"]> = null;

			const unsubscribeFromStatusChanges = usersCollection.on("status:change", (event) => {
				if (event.status === "ready") {
					subscription = usersCollection.subscribeChanges(callback);

					return;
				}

				if (subscription) {
					subscription.unsubscribe();
					subscription = null;
				}
			});

			return () => {
				subscription?.unsubscribe();
				unsubscribeFromStatusChanges();
			};
		},
		() => {
			const user = usersCollection.state.values().toArray().at(0);

			if (user) {
				return user.language;
			}

			return null;
		},
		() => null,
	);

	return language;
};

const FALLBACK_LANGUAGE = "en-US";

export const useDocumentLanguage = (): UserModel["language"] => {
	const homeMatch = useMatch({ from: "/_home/{$language}", shouldThrow: false });
	const appMatch = useMatch({ from: "/app", shouldThrow: false });
	const userLanguage = useUserLanguageSsrSafe();

	if (homeMatch) {
		if (homeMatch.status === "notFound") {
			return FALLBACK_LANGUAGE;
		}

		return homeMatch.params.language;
	}

	if (appMatch) {
		return userLanguage ?? FALLBACK_LANGUAGE;
	}

	return FALLBACK_LANGUAGE;
};
