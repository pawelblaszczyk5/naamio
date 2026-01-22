// cspell:ignore wght

import fontItalicLatinUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-ext-wght-italic.woff2";
import fontStandardLatinExtendedUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-ext-wght-normal.woff2";
import fontItalicLatinExtendedUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-italic.woff2";
import fontStandardLatinUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { HeadContent, Outlet, Scripts, useMatch } from "@tanstack/react-router";
import { useState } from "react";
import { preload } from "react-dom";

import type { UserModel } from "@naamio/schema/domain";

import { assert } from "@naamio/assert";
import { IconSpritesheetContext } from "@naamio/design-system/components/icon";
import iconsSpritesheet from "@naamio/design-system/icons-spritesheet.svg";

import { useUserLanguageSsrSafe } from "#src/features/user/data/queries.js";
import { messages as englishMessages } from "#src/locales/en-US.po";
import { messages as polishMessages } from "#src/locales/pl-PL.po";

import stylesheetHref from "#src/styles.css?url";

const FALLBACK_LANGUAGE = "en-US";

const useLanguage = (): UserModel["language"] => {
	const homeMatch = useMatch({ from: "/_home/{$language}", shouldThrow: false });
	const appMatch = useMatch({ from: "/app", shouldThrow: false });
	const userLanguage = useUserLanguageSsrSafe();

	if (homeMatch) {
		if (homeMatch.status === "notFound") {
			return FALLBACK_LANGUAGE;
		}

		return homeMatch.params.language;
	}

	if (appMatch) {
		return userLanguage ?? FALLBACK_LANGUAGE;
	}

	return FALLBACK_LANGUAGE;
};

const createI18nInstanceForLanguage = (language: UserModel["language"]) => {
	const i18n = setupI18n();

	i18n.load("pl-PL", polishMessages);
	i18n.load("en-US", englishMessages);

	i18n.activate(language);

	return i18n;
};

export const RootDocument = () => {
	const language = useLanguage();

	assert(language, "Language must always be provided default value");

	const [i18n, setI18n] = useState(() => createI18nInstanceForLanguage(language));

	if (language !== i18n.locale) {
		setI18n(createI18nInstanceForLanguage(language));
	}

	preload(fontStandardLatinUrl, { as: "font" });
	preload(fontItalicLatinUrl, { as: "font" });

	if (language === "pl-PL") {
		preload(fontStandardLatinExtendedUrl, { as: "font" });
		preload(fontItalicLatinExtendedUrl, { as: "font" });
	}

	return (
		<I18nProvider i18n={i18n}>
			<IconSpritesheetContext value={iconsSpritesheet}>
				<html lang={language}>
					<head>
						<meta charSet="utf-8" />
						<link href="/naamio.svg" rel="icon" type="image/svg+xml" />
						<link href={stylesheetHref} rel="stylesheet" />
						<meta content="width=device-width, initial-scale=1.0" name="viewport" />
						<HeadContent />
					</head>
					<body>
						<Outlet />
						<Scripts />
					</body>
				</html>
			</IconSpritesheetContext>
		</I18nProvider>
	);
};
