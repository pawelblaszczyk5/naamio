import { createFileRoute } from "@tanstack/react-router";
import { Function, Match } from "effect";

import { AppLayout } from "#src/features/app/ui/app-layout.js";
import {
	checkSessionCacheStatus,
	hydrateSessionCache,
	refreshSessionCache,
} from "#src/features/auth/data/session-cache.js";
import { preloadSessionData } from "#src/features/auth/data/session.js";
import { preloadUserData } from "#src/features/user/data/mod.js";

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
		await Promise.all([preloadUserData(), preloadSessionData()]);
	},
	ssr: false,
});
