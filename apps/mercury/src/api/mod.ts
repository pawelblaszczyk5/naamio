import { Effect, Layer, Option, Redacted } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";

import { NaamioApi } from "@naamio/api";
import { BadGateway } from "@naamio/api/errors";
import { AuthenticatedOnly, CurrentSession } from "@naamio/api/middlewares/authenticated-only";

import { Session } from "#src/features/auth/session.js";
import { WebAuthn } from "#src/features/auth/web-authn.js";
import { Electric } from "#src/features/electric/mod.js";
import { User } from "#src/features/user/mod.js";
import { ClusterRunnerLayer } from "#src/lib/cluster/mod.js";

const AuthenticatedOnlyLayer = Layer.effect(
	AuthenticatedOnly,
	Effect.gen(function* () {
		const session = yield* Session;

		return AuthenticatedOnly.of({
			sessionToken: Effect.fn("@naamio/mercury/AuthenticatedOnly#sessionToken")(function* (effect, options) {
				return yield* Effect.provideServiceEffect(
					effect,
					CurrentSession,
					Effect.gen(function* () {
						const isEmptyToken = yield* Effect.gen(function* () {
							const rawToken = Redacted.value(options.credential);

							return rawToken.length === 0;
						});

						if (isEmptyToken) {
							return yield* new HttpApiError.Unauthorized({});
						}

						const maybeUserSession = yield* session.system.retrieveFromToken(options.credential);

						if (Option.isNone(maybeUserSession)) {
							return yield* new HttpApiError.Unauthorized({});
						}

						return maybeUserSession.value;
					}),
				);
			}),
		});
	}),
).pipe(Layer.provide(Session.layer));

const WebAuthnGroupLayer = HttpApiBuilder.group(
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
						.pipe(Effect.catchTag("UsernameTakenError", () => Effect.fail(new HttpApiError.Conflict({}))));

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
								FailedVerificationError: () => Effect.fail(new HttpApiError.BadRequest({})),
								UnavailableChallengeError: () => Effect.fail(new HttpApiError.Gone({})),
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
					const maybeUserId = yield* Effect.gen(function* () {
						const username = yield* context.payload.username;

						return yield* user.system
							.findIdByUsername(username)
							.pipe(Effect.flatMap((maybeUserId) => maybeUserId.asEffect()));
					}).pipe(Effect.catchNoSuchElement);

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
								FailedVerificationError: () => Effect.fail(new HttpApiError.BadRequest({})),
								MissingPasskeyError: () => Effect.fail(new HttpApiError.NotFound({})),
								UnavailableChallengeError: () => Effect.fail(new HttpApiError.Gone({})),
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
).pipe(Layer.provide([WebAuthn.layer, Session.layer, User.layer, ClusterRunnerLayer]));

const SessionGroupLayer = HttpApiBuilder.group(
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
						.revoke(context.params.sessionId)
						.pipe(
							Effect.catchTags({
								MissingSessionError: () => Effect.fail(new HttpApiError.NotFound({})),
								UnavailableSessionError: () => Effect.fail(new HttpApiError.BadRequest({})),
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
						.sessionShape(context.query)
						.pipe(Effect.catchTag("ShapeProxyError", () => Effect.fail(new BadGateway({}))));
				}),
			);
	}),
).pipe(Layer.provide([Session.layer, Electric.layer, AuthenticatedOnlyLayer]));

const UserGroupLayer = HttpApiBuilder.group(
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
						.userShape(context.query)
						.pipe(Effect.catchTag("ShapeProxyError", () => Effect.fail(new BadGateway({}))));
				}),
			);
	}),
).pipe(Layer.provide([Session.layer, Electric.layer, User.layer, AuthenticatedOnlyLayer]));

const PasskeyGroupLayer = HttpApiBuilder.group(
	NaamioApi,
	"Passkey",
	Effect.fn(function* (handlers) {
		const electric = yield* Electric;

		return handlers.handleRaw(
			"shape",
			Effect.fn("@naamio/mercury/PasskeyGroup#shape")(function* (context) {
				return yield* electric.viewer
					.passkeyShape(context.query)
					.pipe(Effect.catchTag("ShapeProxyError", () => Effect.fail(new BadGateway({}))));
			}),
		);
	}),
).pipe(Layer.provide([Session.layer, Electric.layer, User.layer, AuthenticatedOnlyLayer]));

export const NaamioApiServerLayer = HttpApiBuilder.layer(NaamioApi).pipe(
	Layer.provide([WebAuthnGroupLayer, SessionGroupLayer, UserGroupLayer, PasskeyGroupLayer]),
);
