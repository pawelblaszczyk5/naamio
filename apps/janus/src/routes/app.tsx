import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "#src/features/app/ui/app-layout.js";
import { getSessionCacheEntry, insertSessionCacheEntry } from "#src/features/auth/data/session-cache.js";
import { preloadSessionData } from "#src/features/auth/data/session.js";
import { verifySession } from "#src/features/auth/procedures/authenticated.js";
import { preloadUserData } from "#src/features/user/data/mod.js";

export const Route = createFileRoute("/app")({
	beforeLoad: async () => {
		const sessionCacheEntry = getSessionCacheEntry();

		if (sessionCacheEntry) {
			return;
		}

		const result = await verifySession();

		insertSessionCacheEntry({ id: result.id, lastRefreshAt: new Date() });
	},
	component: AppLayout,
	loader: async () => {
		await Promise.all([preloadUserData(), preloadSessionData()]);
	},
	ssr: false,
});
