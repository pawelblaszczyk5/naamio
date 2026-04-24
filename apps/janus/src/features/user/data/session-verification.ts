import { eq, useLiveQueryEffect } from "@tanstack/react-db";
import { redirect } from "@tanstack/react-router";
import { DateTime, Duration } from "effect";
import { useEffect } from "react";

import { assert } from "@naamio/assert";

import { localSessionsCollection, sessionsCollection } from "#src/features/user/data/collections.js";
import { useSessionId } from "#src/features/user/data/shared.js";
import { verifySession } from "#src/features/user/procedures/mod.js";

const SESSION_VERIFICATION_POLLING_INTERVAL = Duration.minutes(10);
const SESSION_STALE_AGE = Duration.divideUnsafe(SESSION_VERIFICATION_POLLING_INTERVAL, 2);

const getLocalSession = () => localSessionsCollection.state.values().toArray().at(0);

export const checkLocalSessionStatus = () => {
	const localSession = getLocalSession();

	if (!localSession) {
		return "MISSING";
	}

	const nowDateTime = DateTime.makeUnsafe(new Date());
	const entryStaleCutoff = DateTime.makeUnsafe(localSession.refreshedAt).pipe(DateTime.addDuration(SESSION_STALE_AGE));

	const isStale = DateTime.isGreaterThanOrEqualTo(nowDateTime, entryStaleCutoff);

	if (isStale) {
		return "STALE";
	}

	return "FRESH";
};

export const preloadLocalSession = async () => {
	const session = await verifySession();

	if (!session) {
		throw redirect({ to: "/" });
	}

	localSessionsCollection.insert({ id: session.id, refreshedAt: new Date() });
};

export const refreshLocalSession = async () => {
	const session = await verifySession();

	const entry = getLocalSession();

	assert(entry, "Local session must exist in poller");
	assert(session, "Missing session should be caught by electric sync before hitting refresher");

	if (entry.id === session.id) {
		localSessionsCollection.update(session.id, (draft) => {
			draft.refreshedAt = new Date();
		});

		return;
	}

	localSessionsCollection.delete(entry.id);
	localSessionsCollection.insert({ id: session.id, refreshedAt: new Date() });
};

export const useSessionVerificationPoller = () => {
	const sessionId = useSessionId();

	useLiveQueryEffect({
		onExit: () => {
			globalThis.location.reload();
		},
		query: (q) =>
			q
				.from({ session: sessionsCollection })
				.where(({ session }) => eq(session.id, sessionId))
				.findOne(),
	});

	useEffect(() => {
		const interval = setInterval(async () => {
			const localSessionStatus = checkLocalSessionStatus();

			assert(localSessionStatus !== "MISSING", "Local session can't be missing when running poller");

			if (localSessionStatus === "FRESH") {
				return;
			}

			await refreshLocalSession();
		}, Duration.toMillis(SESSION_VERIFICATION_POLLING_INTERVAL));

		return () => {
			clearInterval(interval);
		};
	}, []);
};
