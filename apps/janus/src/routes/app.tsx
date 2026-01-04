import { createFileRoute, Outlet } from "@tanstack/react-router";

import { verifySession } from "#src/modules/session/procedures.js";

const RouteComponent = () => (
	<div>
		Hello "/app"! <Outlet />
	</div>
);

export const Route = createFileRoute("/app")({
	beforeLoad: async () => {
		await verifySession();
	},
	component: RouteComponent,
	ssr: false,
});
