import { createCollection, localOnlyCollectionOptions } from "@tanstack/react-db";
import { DateTime, Duration, Schema } from "effect";
import { useEffect } from "react";

import { assert } from "@naamio/assert";
import { SessionModel } from "@naamio/schema/domain";

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

	sessionCacheCollection.insert({ id: currentSession.id, refreshedAt: new Date() });
};

export const refreshSessionCache = async () => {
	const currentSession = await verifySession();

	const entry = getSessionCacheEntry();

	assert(entry, "Session cache entry must exist in poller");

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
