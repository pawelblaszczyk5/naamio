// cspell:ignore wght

import type { ReactNode } from "react";

import fontItalicLatinUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-ext-wght-italic.woff2";
import fontStandardLatinExtendedUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-ext-wght-normal.woff2";
import fontItalicLatinExtendedUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-italic.woff2";
import fontStandardLatinUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { preload } from "react-dom";

import { IconSpritesheetContext } from "@naamio/design-system/components/icon";
import iconsSpritesheet from "@naamio/design-system/icons-spritesheet.svg";

import stylesheetHref from "#src/styles.css?url";

const RootDocument = ({ children }: Readonly<{ children: ReactNode }>) => {
	preload(fontItalicLatinUrl, { as: "font" });
	preload(fontStandardLatinExtendedUrl, { as: "font" });
	preload(fontItalicLatinExtendedUrl, { as: "font" });
	preload(fontStandardLatinUrl, { as: "font" });

	return (
		<IconSpritesheetContext value={iconsSpritesheet}>
			<html lang="en-US">
				<head>
					<meta charSet="utf-8" />
					<link href="/naamio.svg" rel="icon" type="image/svg+xml" />
					<link href={stylesheetHref} rel="stylesheet" />
					<meta content="width=device-width, initial-scale=1.0" name="viewport" />
					<HeadContent />
				</head>
				<body>
					{children}
					<Scripts />
				</body>
			</html>
		</IconSpritesheetContext>
	);
};

const RootComponent = () => (
	<RootDocument>
		<Outlet />
	</RootDocument>
);

export const Route = createRootRoute({ component: RootComponent });
