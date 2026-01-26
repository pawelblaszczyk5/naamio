import { regex } from "arkregex";
import { Effect, Option } from "effect";

// cspell:ignore Edgi
/* eslint-disable unicorn/prefer-string-raw -- that produces invalid regex here */
const firefox = regex("Firefox/[\\w.]+");
const firefoxOnIos = regex("FxiOS/[\\w.]+");
const seaMonkey = regex("SeaMonkey/[\\w.]+");
const chrome = regex("Chrome/[\\w.]+");
const chromeOnIos = regex("CriOS/[\\w.]+");
const chromium = regex("Chromium/[\\w.]+");
const safari = regex("Safari/[\\w.]+");
const edge = regex("Edg/[\\w.]+");
const edgeOnIos = regex("EdgiOS/[\\w.]+");
const edgeOnAndroid = regex("EdgA/[\\w.]+");
const opera = regex("OPR/[\\w.]+");
const vivaldi = regex("Vivaldi/[\\w.]+");
const braveBase = regex("Brave/[\\w.]+");
const braveChrome = regex("Brave Chrome/[\\w.]+");
const braveBrowser = regex("Brave Browser/[\\w.]+");
/* eslint-enable unicorn/prefer-string-raw -- that produces invalid regex here */

const mobile = regex("Mobile");
const tablet = regex("Tablet");

const DEVICE_LABEL_SEPARATOR = "·";

const extractBrowserName = Effect.fn(function* (userAgent: string) {
	const firefoxMatchResult = firefox.exec(userAgent);
	const seaMonkeyMatchResult = seaMonkey.exec(userAgent);
	const chromeMatchResult = chrome.exec(userAgent);
	const chromiumMatchResult = chromium.exec(userAgent);
	const safariMatchResult = safari.exec(userAgent);
	const edgeMatchResult = edge.exec(userAgent);
	const operaMatchResult = opera.exec(userAgent);
	const vivaldiMatchResult = vivaldi.exec(userAgent);
	const chromeOnIosMatchResult = chromeOnIos.exec(userAgent);
	const firefoxOnIosMatchResult = firefoxOnIos.exec(userAgent);
	const edgeOnIosMatchResult = edgeOnIos.exec(userAgent);
	const edgeOnAndroidMatchResult = edgeOnAndroid.exec(userAgent);
	const braveBaseMatchResult = braveBase.exec(userAgent);
	const braveChromeMatchResult = braveChrome.exec(userAgent);
	const braveBrowserMatchResult = braveBrowser.exec(userAgent);

	if (braveBaseMatchResult || braveChromeMatchResult || braveBrowserMatchResult) {
		return Option.some("Brave" as const);
	}

	if (seaMonkeyMatchResult) {
		return Option.some("SeaMonkey" as const);
	}

	if (firefoxOnIosMatchResult || firefoxMatchResult) {
		return Option.some("Firefox" as const);
	}

	if (edgeOnIosMatchResult || edgeOnAndroidMatchResult || edgeMatchResult) {
		return Option.some("Edge" as const);
	}

	if (operaMatchResult) {
		return Option.some("Opera" as const);
	}

	if (vivaldiMatchResult) {
		return Option.some("Vivaldi" as const);
	}

	if (chromiumMatchResult) {
		return Option.some("Chromium" as const);
	}

	if (chromeOnIosMatchResult || chromeMatchResult) {
		return Option.some("Chrome" as const);
	}

	if (safariMatchResult) {
		return Option.some("Safari" as const);
	}

	return Option.none();
});

const extractDeviceType = Effect.fn(function* (userAgent: string) {
	const mobileMatchResult = mobile.exec(userAgent);
	const tabletMatchResult = tablet.exec(userAgent);

	if (tabletMatchResult) {
		return "Tablet" as const;
	}

	if (mobileMatchResult) {
		return "Mobile" as const;
	}

	return "Desktop" as const;
});

export const extractDeviceLabel = Effect.fn(function* (userAgent: string) {
	const maybeBrowserName = yield* extractBrowserName(userAgent);

	if (Option.isNone(maybeBrowserName)) {
		return Option.none();
	}

	const deviceType = yield* extractDeviceType(userAgent);

	return Option.some(`${maybeBrowserName.value} ${DEVICE_LABEL_SEPARATOR} ${deviceType}`);
});
