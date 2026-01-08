import { createFileRoute } from "@tanstack/react-router";

import { getSessionCacheEntry, insertSessionCacheEntry } from "#src/modules/app/data/session-cache.js";
import { sessionCollection } from "#src/modules/app/data/session.js";
import { userCollection } from "#src/modules/app/data/user.js";
import { AppLayout } from "#src/modules/app/ui/app-layout.js";
import { verifySession } from "#src/modules/session/procedures.js";

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
		await Promise.all([userCollection.preload(), sessionCollection.preload()]);
	},
	ssr: false,
});
