import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { Config, DateTime, Effect, Option, Schema } from "effect";

import { EmailChallengeModel } from "@naamio/schema/domain";

import { CookieSigner } from "#src/lib/cookie-signer/mod.js";

const COOKIE_DOMAIN = Config.string("AUTH_COOKIE_DOMAIN");
const SESSION_COOKIE_NAME = "ses";
const SESSION_COOKIE_SECRET = Config.redacted("AUTH_SESSION_COOKIE_SECRET");
const CHALLENGE_COOKIE_NAME = "aut";
const CHALLENGE_COOKIE_SECRET = Config.redacted("AUTH_CHALLENGE_COOKIE_SECRET");

const SHARED_COOKIE_OPTIONS = { httpOnly: true, path: "/", priority: "high", sameSite: "lax", secure: true } as const;

class ChallengeCookie extends Schema.Class<ChallengeCookie>("@naamio/janus/ChallengeCookie")(
	EmailChallengeModel.json.pick("state"),
) {}

const ChallengeCookieJson = Schema.parseJson(ChallengeCookie);

class SessionCookie extends Schema.Class<SessionCookie>("@naamio/janus/SessionCookie")({
	token: Schema.NonEmptyTrimmedString.pipe(Schema.Redacted),
}) {}

const SessionCookieJson = Schema.parseJson(SessionCookie);

export const setSessionCookie = Effect.fn(function* (data: SessionCookie, expiresAt: DateTime.DateTime) {
	const cookieSigner = yield* CookieSigner;

	const signedEncodedData = yield* cookieSigner.encode(SessionCookieJson, data, yield* SESSION_COOKIE_SECRET);

	setCookie(SESSION_COOKIE_NAME, signedEncodedData, {
		domain: yield* COOKIE_DOMAIN,
		expires: expiresAt.pipe(DateTime.toDate),
		...SHARED_COOKIE_OPTIONS,
	});
});

export const deleteSessionCookie = Effect.fn(function* () {
	deleteCookie(SESSION_COOKIE_NAME, { domain: yield* COOKIE_DOMAIN, ...SHARED_COOKIE_OPTIONS });
});

export const setChallengeCookie = Effect.fn(function* (data: ChallengeCookie, expiresAt: DateTime.DateTime) {
	const cookieSigner = yield* CookieSigner;

	const signedEncodedData = yield* cookieSigner.encode(ChallengeCookieJson, data, yield* CHALLENGE_COOKIE_SECRET);

	setCookie(CHALLENGE_COOKIE_NAME, signedEncodedData, {
		domain: yield* COOKIE_DOMAIN,
		expires: expiresAt.pipe(DateTime.toDate),
		...SHARED_COOKIE_OPTIONS,
	});
});

export const deleteChallengeCookie = Effect.fn(function* () {
	deleteCookie(CHALLENGE_COOKIE_NAME, { domain: yield* COOKIE_DOMAIN, ...SHARED_COOKIE_OPTIONS });
});

export const getDecodedStateFromChallengeCookie = Effect.fn(function* () {
	const cookieSigner = yield* CookieSigner;

	const cookie = getCookie(CHALLENGE_COOKIE_NAME);

	if (!cookie) {
		return Option.none();
	}

	return yield* cookieSigner
		.decode(cookie, ChallengeCookieJson, yield* CHALLENGE_COOKIE_SECRET)
		.pipe(Effect.map(Option.map((challengeCookie) => challengeCookie.state)));
});

export const getDecodedSessionTokenFromSessionCookie = Effect.fn(function* () {
	const cookieSigner = yield* CookieSigner;

	const sessionCookie = getCookie(SESSION_COOKIE_NAME);

	if (!sessionCookie) {
		return Option.none();
	}

	const maybeSessionToken = yield* cookieSigner
		.decode(sessionCookie, SessionCookieJson, yield* SESSION_COOKIE_SECRET)
		.pipe(Effect.map(Option.map((sessionCookie) => sessionCookie.token)));

	if (Option.isNone(maybeSessionToken)) {
		yield* deleteSessionCookie();
	}

	return maybeSessionToken;
});
