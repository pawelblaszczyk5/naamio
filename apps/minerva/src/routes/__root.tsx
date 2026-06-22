import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";

import stylesheetHref from "#src/styles.css?url";

export const Route = createRootRoute({
	component: () => (
		<html lang="en-US" suppressHydrationWarning>
			<head>
				<meta charSet="utf-8" />
				<meta content="width=device-width, initial-scale=1.0" name="viewport" />
				<title>Fumadocs on TanStack Start</title>
				<link href={stylesheetHref} rel="stylesheet" />
				<link href="/naamio.svg" rel="icon" type="image/svg+xml" />
				<HeadContent />
			</head>
			<body className="flex flex-col min-h-screen">
				<RootProvider>
					<Outlet />
				</RootProvider>
				<Scripts />
			</body>
		</html>
	),
});
