import { createCollection, localOnlyCollectionOptions } from "@tanstack/react-db";
import { useServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { useEffect } from "react";

import { assert } from "@naamio/assert";
import { SessionModel } from "@naamio/schema/domain";

import { verifySession } from "#src/features/auth/procedures/authenticated.js";

const SessionCacheEntry = Schema.Struct({ id: SessionModel.json.fields.id, lastRefreshAt: Schema.DateFromSelf });

const sessionCacheCollection = createCollection(
	localOnlyCollectionOptions({
		getKey: (cacheEntry) => cacheEntry.id,
		schema: Schema.standardSchemaV1(SessionCacheEntry),
	}),
);

export const getSessionCacheEntry = () => {
	const sessionCacheEntry = sessionCacheCollection.state.values().take(1).next().value;

	return sessionCacheEntry;
};

export const insertSessionCacheEntry = (entry: (typeof SessionCacheEntry)["Type"]) => {
	sessionCacheCollection.insert(entry);
};

const SESSION_VERIFICATION_POLL_INTERVAL = 60_000;

export const useSessionVerificationPoller = () => {
	const callVerifySession = useServerFn(verifySession);

	useEffect(() => {
		let isCleanedUp = false;

		const interval = setInterval(async () => {
			const result = await callVerifySession();

			if (isCleanedUp) {
				return;
			}

			const sessionCacheEntry = getSessionCacheEntry();

			assert(sessionCacheEntry, "Session cache entry must exist in poller");

			if (sessionCacheEntry.id === result.id) {
				sessionCacheCollection.update(result.id, (draft) => {
					draft.lastRefreshAt = new Date();
				});

				return;
			}

			sessionCacheCollection.delete(sessionCacheEntry.id);
			sessionCacheCollection.insert({ id: result.id, lastRefreshAt: new Date() });
		}, SESSION_VERIFICATION_POLL_INTERVAL);

		return () => {
			isCleanedUp = true;
			clearInterval(interval);
		};
	}, [callVerifySession]);
};
