import { useLiveQuery } from "@tanstack/react-db";
import { useSyncExternalStore } from "react";

import { assert } from "@naamio/assert";

import { userCollection } from "#src/features/user/data/mod.js";

export const useUserLanguageSsrSafe = () => {
	const language = useSyncExternalStore(
		(callback) => {
			let subscription: null | ReturnType<(typeof userCollection)["subscribeChanges"]> = null;

			const unsubscribeFromStatusChanges = userCollection.on("status:change", (event) => {
				if (event.status === "ready") {
					subscription = userCollection.subscribeChanges(callback);

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
			const user = userCollection.state.values().take(1).next().value;

			if (user) {
				return user.language;
			}

			return null;
		},
		() => null,
	);

	return language;
};

export const useUser = () => {
	const { data } = useLiveQuery((q) => q.from({ user: userCollection }).findOne());

	assert(data, "Current user data must always exist");

	return data;
};
