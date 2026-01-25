import { createFileRoute } from "@tanstack/react-router";
import { Function, Match } from "effect";

import { AppLayout } from "#src/features/app/ui/app-layout.js";
import {
	checkSessionCacheStatus,
	hydrateSessionCache,
	refreshSessionCache,
} from "#src/features/user/data/session-verification.js";
import { preloadSessionData } from "#src/features/user/data/session.js";
import { preloadUserData } from "#src/features/user/data/user.js";
import { initializePool } from "#src/lib/id-pool/mod.js";

export const Route = createFileRoute("/app")({
	beforeLoad: async () => {
		const sessionCacheStatus = checkSessionCacheStatus();

		await Match.value(sessionCacheStatus).pipe(
			Match.when("FRESH", Function.constVoid),
			Match.when("MISSING", async () => hydrateSessionCache()),
			Match.when("STALE", () => void refreshSessionCache()),
			Match.exhaustive,
		);
	},
	component: AppLayout,
	loader: async () => {
		await Promise.all([preloadUserData(), preloadSessionData(), initializePool()]);
	},
	ssr: false,
});
