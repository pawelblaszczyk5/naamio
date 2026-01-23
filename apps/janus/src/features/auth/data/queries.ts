import { eq, useLiveQuery } from "@tanstack/react-db";

import { assert } from "@naamio/assert";

import type { Session } from "#src/features/auth/data/session.js";

import { sessionCacheCollection } from "#src/features/auth/data/session-cache.js";
import { sessionCollection } from "#src/features/auth/data/session.js";

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

export const useSessionId = () => {
	const { data } = useLiveQuery((q) => q.from({ sessionCache: sessionCacheCollection }).findOne());

	assert(data, "Session cache entry must always include at least one entry");

	return data.id;
};
