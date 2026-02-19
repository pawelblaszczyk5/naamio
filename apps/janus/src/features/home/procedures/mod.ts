import { AcceptLanguage } from "@remix-run/headers";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { Effect, Option, Schema, Struct } from "effect";

import { WebAuthnAuthenticationResponse, WebAuthnRegistrationResponse } from "@naamio/schema/api";
import { UserModel, WebAuthnRegistrationChallengeModel } from "@naamio/schema/domain";

import { extractDeviceLabel } from "#src/features/home/utilities/device-label.js";
import { NaamioApiClient } from "#src/lib/api-client/mod.js";
import {
	deleteWebAuthnChallengeCookie,
	getDecodedWebAuthnChallengeCookie,
	setSessionCookie,
	setWebAuthnChallengeCookie,
} from "#src/lib/cookies/mod.js";
import { sessionTokenMiddleware } from "#src/lib/effect-bridge/middleware.js";
import { runServerFn } from "#src/lib/effect-bridge/mod.js";

const GenerateRegistrationOptionsPayload = UserModel.jsonCreate
	.mapFields(Struct.pick(["username", "language"]))
	.pipe(Schema.fieldsAssign({ displayName: WebAuthnRegistrationChallengeModel.jsonCreate.fields.displayName }));

export const generateRegistrationOptions = createServerFn({ method: "POST" })
	.inputValidator(Schema.toStandardSchemaV1(GenerateRegistrationOptionsPayload))
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const result = yield* naamioApiClient.WebAuthn.generateRegistrationOptions({
				payload: { displayName: ctx.data.displayName, language: ctx.data.language, username: ctx.data.username },
			});

			yield* setWebAuthnChallengeCookie({ id: result.challengeId, type: "REGISTRATION" }, result.expiresAt);

			return { registrationOptions: result.registrationOptions };
		}).pipe(Effect.withSpan("@naamio/janus/home/generateRegistrationOptions"), runServerFn),
	);

const VerifyRegistrationPayload = Schema.Struct({ registrationResponse: WebAuthnRegistrationResponse });

export const verifyRegistration = createServerFn({ method: "POST" })
	.inputValidator(Schema.toStandardSchemaV1(VerifyRegistrationPayload))
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const maybeWebAuthnChallenge = yield* getDecodedWebAuthnChallengeCookie();

			if (Option.isNone(maybeWebAuthnChallenge)) {
				return null;
			}

			if (maybeWebAuthnChallenge.value.type !== "REGISTRATION") {
				return null;
			}

			const userAgent = getRequestHeader("User-Agent");
			const deviceLabel = userAgent ? yield* extractDeviceLabel(userAgent) : Option.none();

			const result = yield* naamioApiClient.WebAuthn.verifyRegistration({
				payload: {
					challengeId: maybeWebAuthnChallenge.value.id,
					deviceLabel,
					registrationResponse: ctx.data.registrationResponse,
				},
			});

			yield* setSessionCookie(result.token, result.expiresAt);
			yield* deleteWebAuthnChallengeCookie();

			return redirect({ replace: true, to: "/app" });
		}).pipe(Effect.withSpan("@naamio/janus/home/verifyRegistration"), runServerFn),
	);

const GenerateAuthenticationOptionsPayload = Schema.Struct({
	username: UserModel.json.fields.username.pipe(Schema.OptionFromOptionalKey),
});

export const generateAuthenticationOptions = createServerFn({ method: "POST" })
	.inputValidator(Schema.toStandardSchemaV1(GenerateAuthenticationOptionsPayload))
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const result = yield* naamioApiClient.WebAuthn.generateAuthenticationOptions({
				payload: { username: ctx.data.username },
			});

			yield* setWebAuthnChallengeCookie({ id: result.challengeId, type: "AUTHENTICATION" }, result.expiresAt);

			return { authenticationOptions: result.authenticationOptions };
		}).pipe(Effect.withSpan("@naamio/janus/home/generateAuthenticationOptions"), runServerFn),
	);

const VerifyAuthenticationPayload = Schema.Struct({ authenticationResponse: WebAuthnAuthenticationResponse });

export const verifyAuthentication = createServerFn({ method: "POST" })
	.inputValidator(Schema.toStandardSchemaV1(VerifyAuthenticationPayload))
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const maybeWebAuthnChallenge = yield* getDecodedWebAuthnChallengeCookie();

			if (Option.isNone(maybeWebAuthnChallenge)) {
				return null;
			}

			if (maybeWebAuthnChallenge.value.type !== "AUTHENTICATION") {
				return null;
			}

			const userAgent = getRequestHeader("User-Agent");
			const deviceLabel = userAgent ? yield* extractDeviceLabel(userAgent) : Option.none();

			const result = yield* naamioApiClient.WebAuthn.verifyAuthentication({
				payload: {
					authenticationResponse: ctx.data.authenticationResponse,
					challengeId: maybeWebAuthnChallenge.value.id,
					deviceLabel,
				},
			});

			yield* setSessionCookie(result.token, result.expiresAt);
			yield* deleteWebAuthnChallengeCookie();

			return redirect({ replace: true, to: "/app" });
		}).pipe(Effect.withSpan("@naamio/janus/home/verifyAuthentication"), runServerFn),
	);

export const checkHasSessionToken = createServerFn({ method: "GET" })
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			return ctx.context.sessionToken !== null;
		}).pipe(Effect.withSpan("@naamio/janus/home/checkHasSessionToken"), runServerFn),
	);

export const getPreferredLanguage = createServerFn({ method: "GET" }).handler(async () =>
	Effect.gen(function* () {
		const header = getRequestHeader("Accept-Language");

		if (!header) {
			return "en-US";
		}

		const acceptLanguage = AcceptLanguage.from(header);
		const preferred = acceptLanguage.getPreferred(["en-US", "pl-PL"]) ?? "en-US";

		return preferred;
	}).pipe(
		Effect.withSpan("@naamio/janus/home/getPreferredLanguage"),
		Effect.satisfiesSuccessType<UserModel["language"]>(),
		runServerFn,
	),
);
