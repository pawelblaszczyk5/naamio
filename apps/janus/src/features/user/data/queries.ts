import { useLiveQuery } from "@tanstack/react-db";
import { useSyncExternalStore } from "react";

import { assert } from "@naamio/assert";

import { passkeyCollection } from "#src/features/user/data/passkey.js";
import { sessionCacheCollection } from "#src/features/user/data/session-cache.js";
import { sessionCollection } from "#src/features/user/data/session.js";
import { userCollection } from "#src/features/user/data/user.js";

export const useSessionId = () => {
	const { data } = useLiveQuery((q) => q.from({ sessionCache: sessionCacheCollection }).findOne());

	assert(data, "Session cache entry must always include at least one entry");

	return data.id;
};

export const useSessions = () =>
	useLiveQuery((q) => q.from({ session: sessionCollection }).orderBy(({ session }) => session.expiresAt, "desc")).data;

export const usePasskeys = () =>
	useLiveQuery((q) => q.from({ passkey: passkeyCollection }).orderBy(({ passkey }) => passkey.createdAt, "desc")).data;

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
			const user = userCollection.state.values().toArray().at(0);

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
