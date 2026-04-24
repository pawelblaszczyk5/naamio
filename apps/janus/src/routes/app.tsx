import { createFileRoute } from "@tanstack/react-router";
import { Function, Match } from "effect";

import { AppLayout } from "#src/features/app/ui/app-layout.js";
import {
	conversationsCollection,
	inflightChunksCollection,
	messagePartsCollection,
	messagesCollection,
} from "#src/features/chat/data/collections.js";
import { passkeysCollection, sessionsCollection, usersCollection } from "#src/features/user/data/collections.js";
import {
	checkLocalSessionStatus,
	preloadLocalSession,
	refreshLocalSession,
} from "#src/features/user/data/session-verification.js";
import { initializePool } from "#src/lib/id-pool/mod.js";

export const Route = createFileRoute("/app")({
	ssr: false,
	component: AppLayout,
	beforeLoad: async () => {
		const sessionCacheStatus = checkLocalSessionStatus();

		await Match.value(sessionCacheStatus).pipe(
			Match.when("FRESH", Function.constVoid),
			Match.when("MISSING", async () => preloadLocalSession()),
			Match.when("STALE", () => void refreshLocalSession()),
			Match.exhaustive,
		);
	},
	loader: async () => {
		await Promise.all([
			usersCollection.preload(),
			sessionsCollection.preload(),
			passkeysCollection.preload(),
			conversationsCollection.preload(),
			messagesCollection.preload(),
			messagePartsCollection.preload(),
			inflightChunksCollection.preload(),
			initializePool(),
		]);
	},
});
