import { Outlet } from "@tanstack/react-router";

import { useSessionVerificationPoller } from "#src/features/user/data/session-verification.js";

export const AppLayout = () => {
	useSessionVerificationPoller();

	return <Outlet />;
};
