import { HttpApiBuilder, HttpApiError } from "@effect/platform";
import { Effect, Layer, Option, Redacted } from "effect";

import { NaamioApi } from "@naamio/api";
import { BadGateway } from "@naamio/api/errors";
import { AuthenticatedOnly } from "@naamio/api/middlewares/authenticated-only";

import type { UsernameTakenError } from "#src/features/user/mod.js";

import { Session } from "#src/features/auth/session.js";
import { WebAuthn } from "#src/features/auth/web-authn.js";
import { Electric } from "#src/features/electric/mod.js";
import { User } from "#src/features/user/mod.js";
import { ClusterRunnerLive } from "#src/lib/cluster/mod.js";

const AuthenticatedOnlyLive = Layer.effect(
	AuthenticatedOnly,
	Effect.gen(function* () {
		const session = yield* Session;

		return AuthenticatedOnly.of({
			sessionToken: Effect.fn("@naamio/mercury/AuthenticatedOnly#sessionToken")(function* (token) {
				const isEmptyToken = yield* Effect.gen(function* () {
					const rawToken = Redacted.value(token);

					return rawToken.length === 0;
				});

				if (isEmptyToken) {
					return yield* new HttpApiError.Unauthorized();
				}

				const maybeUserSession = yield* session.system.retrieveFromToken(token);

				if (Option.isNone(maybeUserSession)) {
					return yield* new HttpApiError.Unauthorized();
				}

				return maybeUserSession.value;
			}),
		});
	}),
).pipe(Layer.provide(Session.Live));

const WebAuthnGroupLive = HttpApiBuilder.group(
	NaamioApi,
	"WebAuthn",
	Effect.fn(function* (handlers) {
		const webAuthn = yield* WebAuthn;
		const session = yield* Session;
		const user = yield* User;

		return handlers
			.handle(
				"generateRegistrationOptions",
				Effect.fn("@naamio/mercury/WebAuthnGroup#generateRegistrationOptions")(function* (context) {
					const newUser = yield* user.system
						.create({ language: context.payload.language, username: context.payload.username })
						.pipe(
							Effect.ensureErrorType<UsernameTakenError>(),
							Effect.mapError(() => new HttpApiError.Conflict()),
						);

					return yield* webAuthn.system.generateRegistrationOptions({
						displayName: context.payload.displayName,
						id: newUser.id,
						username: newUser.username,
						webAuthnId: newUser.webAuthnId,
					});
				}),
			)
			.handle(
				"verifyRegistration",
				Effect.fn("@naamio/mercury/WebAuthnGroup#verifyRegistration")(function* (context) {
					const createdPasskey = yield* webAuthn.system
						.verifyRegistrationResponse({
							challengeId: context.payload.challengeId,
							registrationResponse: context.payload.registrationResponse,
						})
						.pipe(
							Effect.catchTags({
								FailedVerificationError: () => new HttpApiError.BadRequest(),
								UnavailableChallengeError: () => new HttpApiError.Gone(),
							}),
						);

					yield* user.system.confirm(createdPasskey.userId);

					return yield* session.system.create({
						deviceLabel: context.payload.deviceLabel,
						passkeyId: createdPasskey.id,
						userId: createdPasskey.userId,
					});
				}),
			)
			.handle(
				"generateAuthenticationOptions",
				Effect.fn("@naamio/mercury/WebAuthnGroup#generateAuthenticationOptions")(function* (context) {
					const maybeUserId = yield* Effect.transposeMapOption(
						context.payload.username,
						Effect.fn(function* (username) {
							return yield* user.system.findIdByUsername(username);
						}),
					).pipe(Effect.map(Option.flatten));

					if (Option.isSome(context.payload.username) && Option.isNone(maybeUserId)) {
						return yield* new HttpApiError.NotFound();
					}

					return yield* webAuthn.system.generateAuthenticationOptions(maybeUserId);
				}),
			)
			.handle(
				"verifyAuthentication",
				Effect.fn("@naamio/mercury/WebAuthnGroup#verifyAuthentication")(function* (context) {
					const existingPasskey = yield* webAuthn.system
						.verifyAuthenticationResponse({
							authenticationResponse: context.payload.authenticationResponse,
							challengeId: context.payload.challengeId,
						})
						.pipe(
							Effect.catchTags({
								FailedVerificationError: () => new HttpApiError.BadRequest(),
								MissingPasskeyError: () => new HttpApiError.NotFound(),
								UnavailableChallengeError: () => new HttpApiError.Gone(),
							}),
						);

					return yield* session.system.create({
						deviceLabel: context.payload.deviceLabel,
						passkeyId: existingPasskey.id,
						userId: existingPasskey.userId,
					});
				}),
			);
	}),
).pipe(Layer.provide([WebAuthn.Live, Session.Live, User.Live, ClusterRunnerLive]));

const SessionGroupLive = HttpApiBuilder.group(
	NaamioApi,
	"Session",
	Effect.fn(function* (handlers) {
		const session = yield* Session;
		const electric = yield* Electric;

		return handlers
			.handle(
				"verify",
				Effect.fn("@naamio/mercury/SessionGroup#verify")(function* () {
					return yield* session.viewer.verify();
				}),
			)
			.handle(
				"revoke",
				Effect.fn("@naamio/mercury/SessionGroup#revoke")(function* (context) {
					return yield* session.viewer
						.revoke(context.path.id)
						.pipe(
							Effect.catchTags({
								MissingSessionError: () => new HttpApiError.NotFound(),
								UnavailableSessionError: () => new HttpApiError.BadRequest(),
							}),
						);
				}),
			)
			.handle(
				"revokeAll",
				Effect.fn("@naamio/mercury/SessionGroup#revokeAll")(function* () {
					yield* session.viewer.revokeAll();
				}),
			)
			.handleRaw(
				"shape",
				Effect.fn("@naamio/mercury/SessionGroup#shape")(function* (context) {
					return yield* electric.viewer
						.sessionShape(context.urlParams)
						.pipe(Effect.catchTag("ShapeProxyError", () => new BadGateway()));
				}),
			);
	}),
).pipe(Layer.provide([Session.Live, Electric.Live, AuthenticatedOnlyLive]));

const UserGroupLive = HttpApiBuilder.group(
	NaamioApi,
	"User",
	Effect.fn(function* (handlers) {
		const user = yield* User;
		const electric = yield* Electric;

		return handlers
			.handle(
				"updateLanguage",
				Effect.fn("@naamio/mercury/UserGroup#updateLanguage")(function* (context) {
					return yield* user.viewer.updateLanguage(context.payload.language);
				}),
			)
			.handleRaw(
				"shape",
				Effect.fn("@naamio/mercury/UserGroup#shape")(function* (context) {
					return yield* electric.viewer
						.userShape(context.urlParams)
						.pipe(Effect.catchTag("ShapeProxyError", () => new BadGateway()));
				}),
			);
	}),
).pipe(Layer.provide([Session.Live, Electric.Live, User.Live, AuthenticatedOnlyLive]));

const PasskeyGroupLive = HttpApiBuilder.group(
	NaamioApi,
	"Passkey",
	Effect.fn(function* (handlers) {
		const electric = yield* Electric;

		return handlers.handleRaw(
			"shape",
			Effect.fn("@naamio/mercury/PasskeyGroup#shape")(function* (context) {
				return yield* electric.viewer
					.passkeyShape(context.urlParams)
					.pipe(Effect.catchTag("ShapeProxyError", () => new BadGateway()));
			}),
		);
	}),
).pipe(Layer.provide([Session.Live, Electric.Live, User.Live, AuthenticatedOnlyLive]));

export const NaamioApiServerLive = HttpApiBuilder.api(NaamioApi).pipe(
	Layer.provide([WebAuthnGroupLive, SessionGroupLive, UserGroupLive, PasskeyGroupLive]),
);
