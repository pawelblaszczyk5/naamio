import { createCollection, localOnlyCollectionOptions, useLiveQuery } from "@tanstack/react-db";
import { redirect } from "@tanstack/react-router";
import { DateTime, Duration, Schema } from "effect";
import { useEffect } from "react";

import { assert } from "@naamio/assert";
import { SessionModel } from "@naamio/schema/domain";

import { useSessionById } from "#src/features/auth/data/session.js";
import { verifySession } from "#src/features/auth/procedures/authenticated.js";

const SESSION_VERIFICATION_POLLING_INTERVAL = Duration.minutes(10);
const SESSION_STALE_AGE = Duration.unsafeDivide(SESSION_VERIFICATION_POLLING_INTERVAL, 2);

const SessionCacheEntry = Schema.Struct({ id: SessionModel.json.fields.id, refreshedAt: Schema.DateFromSelf });

const sessionCacheCollection = createCollection(
	localOnlyCollectionOptions({
		getKey: (cacheEntry) => cacheEntry.id,
		schema: Schema.standardSchemaV1(SessionCacheEntry),
	}),
);

const getSessionCacheEntry = () => sessionCacheCollection.state.values().take(1).next().value;

export const checkSessionCacheStatus = () => {
	const entry = getSessionCacheEntry();

	if (!entry) {
		return "MISSING";
	}

	const currentDateTime = DateTime.unsafeMake(new Date());
	const entryStaleCutoff = DateTime.unsafeMake(entry.refreshedAt).pipe(DateTime.addDuration(SESSION_STALE_AGE));

	const isStale = DateTime.greaterThanOrEqualTo(currentDateTime, entryStaleCutoff);

	if (isStale) {
		return "STALE";
	}

	return "FRESH";
};

export const hydrateSessionCache = async () => {
	const currentSession = await verifySession();

	if (!currentSession) {
		throw redirect({ to: "/" });
	}

	sessionCacheCollection.insert({ id: currentSession.id, refreshedAt: new Date() });
};

export const refreshSessionCache = async () => {
	const currentSession = await verifySession();

	const entry = getSessionCacheEntry();

	assert(entry, "Session cache entry must exist in poller");
	assert(currentSession, "Missing session should be caught by electric sync before hitting refresher");

	if (entry.id === currentSession.id) {
		sessionCacheCollection.update(currentSession.id, (draft) => {
			draft.refreshedAt = new Date();
		});

		return;
	}

	sessionCacheCollection.delete(entry.id);
	sessionCacheCollection.insert({ id: currentSession.id, refreshedAt: new Date() });
};

export const useSessionVerificationPoller = () => {
	const { data } = useLiveQuery((q) => q.from({ sessionCache: sessionCacheCollection }).findOne());

	assert(data, "Session cache entry must always include at least one entry");

	const session = useSessionById(data.id);

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
