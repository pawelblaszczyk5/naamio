// cspell:ignore wght

import type { ReactNode } from "react";

import fontItalicLatinUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-ext-wght-italic.woff2";
import fontStandardLatinExtendedUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-ext-wght-normal.woff2";
import fontItalicLatinExtendedUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-italic.woff2";
import fontStandardLatinUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { HeadContent, Outlet, Scripts, useMatch, useParams } from "@tanstack/react-router";
import { use, useState, useSyncExternalStore } from "react";
import { preload } from "react-dom";

import type { UserModel } from "@naamio/schema/domain";

import { assert } from "@naamio/assert";
import { IconSpritesheetContext } from "@naamio/design-system/components/icon";
import iconsSpritesheet from "@naamio/design-system/icons-spritesheet.svg";
import stylex from "@naamio/stylex";

import { useMaybeCurrentUser } from "#src/features/user/data/mod.js";
import { LanguageContext } from "#src/lib/shell/language-context.js";
import { messages as englishMessages } from "#src/locales/en-US.po";
import { messages as polishMessages } from "#src/locales/pl-PL.po";

import stylesheetHref from "#src/styles.css?url";

const styles = stylex.create({ body: { padding: 32 } });

const FallbackLanguageProvider = ({ children }: { children: ReactNode }) => (
	<LanguageContext value="en-US">{children}</LanguageContext>
);

const HomeLanguageProvider = ({ children }: { children: ReactNode }) => {
	const params = useParams({ from: "/_home/{$language}" });

	return <LanguageContext value={params.language}>{children}</LanguageContext>;
};

const InternalAppLanguageProvider = ({ children }: { children: ReactNode }) => {
	const currentUser = useMaybeCurrentUser();

	if (!currentUser) {
		return <LanguageContext value="en-US">{children}</LanguageContext>;
	}

	return <LanguageContext value={currentUser.language}>{children}</LanguageContext>;
};

const AppLanguageProvider = ({ children }: { children: ReactNode }) => {
	const isHydrated = useSyncExternalStore(
		// eslint-disable-next-line unicorn/consistent-function-scoping, @typescript-eslint/no-empty-function -- temporary solution, I'm not yet sure whether I'll handle it this way
		() => () => {},
		() => true,
		() => false,
	);

	if (!isHydrated) {
		return <LanguageContext value="en-US">{children}</LanguageContext>;
	}

	return <InternalAppLanguageProvider>{children}</InternalAppLanguageProvider>;
};

const LanguageProvider = ({ children }: { children: ReactNode }) => {
	const homeMatch = useMatch({ from: "/_home/{$language}", shouldThrow: false });
	const appMatch = useMatch({ from: "/app", shouldThrow: false });

	if (homeMatch) {
		if (homeMatch.status === "notFound") {
			return <FallbackLanguageProvider>{children}</FallbackLanguageProvider>;
		}

		return <HomeLanguageProvider>{children}</HomeLanguageProvider>;
	}

	if (appMatch) {
		return <AppLanguageProvider>{children}</AppLanguageProvider>;
	}

	return <FallbackLanguageProvider>{children}</FallbackLanguageProvider>;
};

const createI18nInstanceForLanguage = (language: UserModel["language"]) => {
	const i18n = setupI18n();

	i18n.load("pl-PL", polishMessages);
	i18n.load("en-US", englishMessages);

	i18n.activate(language);

	return i18n;
};

const Document = () => {
	const language = use(LanguageContext);

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
					<body {...stylex.props(styles.body)}>
						<Outlet />
						<Scripts />
					</body>
				</html>
			</IconSpritesheetContext>
		</I18nProvider>
	);
};

export const RootDocument = () => (
	<LanguageProvider>
		<Document />
	</LanguageProvider>
);
