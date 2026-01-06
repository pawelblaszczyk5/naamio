import { createFileRoute } from "@tanstack/react-router";

import { getSessionCacheEntry, insertSessionCacheEntry } from "#src/modules/app/data/session-cache.js";
import { AppLayout } from "#src/modules/app/ui/app-layout.js";
import { verifySession } from "#src/modules/session/procedures.js";

export const Route = createFileRoute("/app")({
	beforeLoad: async () => {
		const sessionCacheEntry = getSessionCacheEntry();

		if (sessionCacheEntry) {
			return;
		}

		const result = await verifySession();

		insertSessionCacheEntry({ lastRefreshAt: new Date(), publicId: result.publicId });
	},
	component: AppLayout,
	ssr: false,
});
