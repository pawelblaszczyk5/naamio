import { redirect } from "@tanstack/react-router";
import { DateTime, Duration } from "effect";
import { useEffect } from "react";

import { assert } from "@naamio/assert";

import { useSessionById, useSessionId } from "#src/features/user/data/queries.js";
import { sessionCacheCollection } from "#src/features/user/data/session-cache.js";
import { verifySession } from "#src/features/user/procedures/mod.js";

const SESSION_VERIFICATION_POLLING_INTERVAL = Duration.minutes(10);
const SESSION_STALE_AGE = Duration.divideUnsafe(SESSION_VERIFICATION_POLLING_INTERVAL, 2);

const getSessionCacheEntry = () => sessionCacheCollection.state.values().take(1).next().value;

export const checkSessionCacheStatus = () => {
	const entry = getSessionCacheEntry();

	if (!entry) {
		return "MISSING";
	}

	const nowDateTime = DateTime.makeUnsafe(new Date());
	const entryStaleCutoff = DateTime.makeUnsafe(entry.refreshedAt).pipe(DateTime.addDuration(SESSION_STALE_AGE));

	const isStale = DateTime.isGreaterThanOrEqualTo(nowDateTime, entryStaleCutoff);

	if (isStale) {
		return "STALE";
	}

	return "FRESH";
};

export const hydrateSessionCache = async () => {
	const session = await verifySession();

	if (!session) {
		throw redirect({ to: "/" });
	}

	sessionCacheCollection.insert({ id: session.id, refreshedAt: new Date() });
};

export const refreshSessionCache = async () => {
	const session = await verifySession();

	const entry = getSessionCacheEntry();

	assert(entry, "Session cache entry must exist in poller");
	assert(session, "Missing session should be caught by electric sync before hitting refresher");

	if (entry.id === session.id) {
		sessionCacheCollection.update(session.id, (draft) => {
			draft.refreshedAt = new Date();
		});

		return;
	}

	sessionCacheCollection.delete(entry.id);
	sessionCacheCollection.insert({ id: session.id, refreshedAt: new Date() });
};

export const useSessionVerificationPoller = () => {
	const sessionId = useSessionId();

	const session = useSessionById(sessionId);

	useEffect(() => {
		if (!session) {
			globalThis.location.reload();
		}
	}, [session]);

	useEffect(() => {
		const interval = setInterval(async () => {
			const sessionCacheStatus = checkSessionCacheStatus();

			assert(sessionCacheStatus !== "MISSING", "Session cache entry can't be missing when running poller");

			if (sessionCacheStatus === "FRESH") {
				return;
			}

			await refreshSessionCache();
		}, Duration.toMillis(SESSION_VERIFICATION_POLLING_INTERVAL));

		return () => {
			clearInterval(interval);
		};
	}, []);
};
