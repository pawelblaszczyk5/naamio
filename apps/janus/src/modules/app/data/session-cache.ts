import { createCollection, localOnlyCollectionOptions } from "@tanstack/react-db";
import { useServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { useEffect } from "react";

import { assert } from "@naamio/assert";
import { SessionModel } from "@naamio/schema";

import { verifySession } from "#src/modules/session/procedures.js";

const SessionCacheEntry = Schema.Struct({
	lastRefreshAt: Schema.DateFromSelf,
	publicId: SessionModel.json.fields.publicId,
});

const sessionCacheCollection = createCollection(
	localOnlyCollectionOptions({
		getKey: (cacheEntry) => cacheEntry.publicId,
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

			if (sessionCacheEntry.publicId === result.publicId) {
				sessionCacheCollection.update(result.publicId, (draft) => {
					draft.lastRefreshAt = new Date();
				});

				return;
			}

			sessionCacheCollection.delete(sessionCacheEntry.publicId);
			sessionCacheCollection.insert({ lastRefreshAt: new Date(), publicId: result.publicId });
		}, SESSION_VERIFICATION_POLL_INTERVAL);

		return () => {
			isCleanedUp = true;
			clearInterval(interval);
		};
	}, [callVerifySession]);
};
