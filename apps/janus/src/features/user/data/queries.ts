import { eq, useLiveQuery } from "@tanstack/react-db";
import { useSyncExternalStore } from "react";

import { assert } from "@naamio/assert";

import type { Session } from "#src/features/user/data/session.js";

import { sessionCacheCollection } from "#src/features/user/data/session-cache.js";
import { sessionCollection } from "#src/features/user/data/session.js";
import { userCollection } from "#src/features/user/data/user.js";

export const useSessionId = () => {
	const { data } = useLiveQuery((q) => q.from({ sessionCache: sessionCacheCollection }).findOne());

	assert(data, "Session cache entry must always include at least one entry");

	return data.id;
};

export const useSessionById = (id: Session["id"]) =>
	useLiveQuery(
		(q) =>
			q
				.from({ session: sessionCollection })
				.where(({ session }) => eq(session.id, id))
				.findOne(),
		[id],
	).data;

export const useSessions = () =>
	useLiveQuery((q) => q.from({ session: sessionCollection }).orderBy(({ session }) => session.expiresAt, "desc")).data;

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
