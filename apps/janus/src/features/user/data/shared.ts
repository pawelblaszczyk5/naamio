import { useLiveQuery } from "@tanstack/react-db";

import { assert } from "@naamio/assert";

import { localSessionsCollection, usersCollection } from "#src/features/user/data/collections.js";

export const useSessionId = () => {
	const { data } = useLiveQuery((q) => q.from({ localSession: localSessionsCollection }).findOne());

	assert(data, "Session cache entry must always include at least one entry");

	return data.id;
};

export const useUser = () => {
	const { data } = useLiveQuery((q) => q.from({ user: usersCollection }).findOne());

	assert(data, "Current user data must always exist");

	return data;
};
