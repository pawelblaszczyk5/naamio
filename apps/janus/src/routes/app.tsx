import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "#src/modules/app/ui/app-layout.js";
import { verifySession } from "#src/modules/session/procedures.js";

export const Route = createFileRoute("/app")({
	beforeLoad: async () => {
		await verifySession();
	},
	component: AppLayout,
	ssr: false,
});
