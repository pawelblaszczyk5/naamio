// cspell:ignore wght

import type { ReactNode } from "react";

import fontItalicLatinUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-ext-wght-italic.woff2";
import fontStandardLatinExtendedUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-ext-wght-normal.woff2";
import fontItalicLatinExtendedUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-italic.woff2";
import fontStandardLatinUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useState } from "react";
import { preload } from "react-dom";

import { IconSpritesheetContext } from "@naamio/design-system/components/icon";
import iconsSpritesheet from "@naamio/design-system/icons-spritesheet.svg";

import { messages as englishMessages } from "#src/locales/en-US.po";
import { messages as polishMessages } from "#src/locales/pl-PL.po";

import stylesheetHref from "#src/styles.css?url";

const RootDocument = ({ children }: Readonly<{ children: ReactNode }>) => {
	// eslint-disable-next-line react-naming-convention/use-state -- for now, will change in future when language will be possible to change
	const [i18n] = useState(() => {
		const i18n = setupI18n();

		i18n.load("pl-PL", polishMessages);
		i18n.load("en-US", englishMessages);

		i18n.activate("pl-PL");

		return i18n;
	});

	preload(fontItalicLatinUrl, { as: "font" });
	preload(fontStandardLatinExtendedUrl, { as: "font" });
	preload(fontItalicLatinExtendedUrl, { as: "font" });
	preload(fontStandardLatinUrl, { as: "font" });

	return (
		<I18nProvider i18n={i18n}>
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
		</I18nProvider>
	);
};

const RootComponent = () => (
	<RootDocument>
		<Outlet />
	</RootDocument>
);

export const Route = createRootRoute({ component: RootComponent });
