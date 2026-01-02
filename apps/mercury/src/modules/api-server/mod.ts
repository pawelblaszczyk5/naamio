import { HttpApiBuilder, HttpApiError } from "@effect/platform";
import { Effect, Layer, Option } from "effect";

import { NaamioApi } from "@naamio/api";
import { InsufficientStorage, TooManyRequests } from "@naamio/api/errors";

import { Authenticator, AuthenticatorLive } from "#src/modules/auth/authenticator.js";
import { EmailChallenge } from "#src/modules/auth/email-challenge.js";
import { Session } from "#src/modules/auth/session.js";
import { ClusterRunnerLive } from "#src/modules/cluster/mod.js";
import { User } from "#src/modules/user/mod.js";

const AuthenticationGroupLive = HttpApiBuilder.group(
	NaamioApi,
	"Authentication",
	Effect.fn(function* (handlers) {
		const emailChallenge = yield* EmailChallenge;
		const session = yield* Session;
		const user = yield* User;

		const getAuthenticatorEntity = yield* Authenticator.client;

		return handlers
			.handle(
				"getEmailChallengeMetadata",
				Effect.fn(function* (context) {
					return yield* emailChallenge.system.findMetadata(context.path.state).pipe(
						Effect.flatMap((maybeEmailChallengeMetadata) => maybeEmailChallengeMetadata),
						Effect.catchTag("NoSuchElementException", () => new HttpApiError.NotFound()),
					);
				}),
			)
			.handle(
				"initializeEmailChallenge",
				Effect.fn(function* (context) {
					const authenticatorEntity = getAuthenticatorEntity(context.payload.email);

					const result = yield* authenticatorEntity
						.InitializeChallenge({ language: context.payload.language })
						.pipe(
							Effect.catchTags({
								AlreadyProcessingMessage: () => new InsufficientStorage(),
								MailboxFull: () => new InsufficientStorage(),
								PersistenceError: () => new InsufficientStorage(),
								TooManyAuthenticatorRequestsError: () => new TooManyRequests(),
							}),
						);

					return result;
				}),
			)
			.handle(
				"refreshEmailChallenge",
				Effect.fn(function* (context) {
					const challenge = yield* emailChallenge.system.findMetadata(context.path.state).pipe(
						Effect.flatMap((maybeEmailChallengeMetadata) => maybeEmailChallengeMetadata),
						Effect.catchTag("NoSuchElementException", () => new HttpApiError.BadRequest()),
					);

					const authenticatorEntity = getAuthenticatorEntity(challenge.email);

					const result = yield* authenticatorEntity
						.RefreshChallenge({ state: context.path.state })
						.pipe(
							Effect.catchTags({
								AlreadyProcessingMessage: () => new InsufficientStorage(),
								ChallengeRefreshUnavailableError: () => new HttpApiError.BadRequest(),
								MailboxFull: () => new InsufficientStorage(),
								MissingChallengeError: () => new HttpApiError.BadRequest(),
								PersistenceError: () => new InsufficientStorage(),
								TooManyAuthenticatorRequestsError: () => new TooManyRequests(),
								UnavailableChallengeError: () => new HttpApiError.BadRequest(),
							}),
						);

					return result;
				}),
			)
			.handle(
				"solveEmailChallenge",
				Effect.fn(function* (context) {
					const challenge = yield* emailChallenge.system.findMetadata(context.path.state).pipe(
						Effect.flatMap((maybeEmailChallengeMetadata) => maybeEmailChallengeMetadata),
						Effect.catchTag("NoSuchElementException", () => new HttpApiError.BadRequest()),
					);

					const authenticatorEntity = getAuthenticatorEntity(challenge.email);

					yield* authenticatorEntity
						.SolveChallenge({ code: context.payload.code, state: context.path.state })
						.pipe(
							Effect.catchTags({
								AlreadyProcessingMessage: () => new InsufficientStorage(),
								InvalidChallengeAttemptError: () => new HttpApiError.BadRequest(),
								MailboxFull: () => new InsufficientStorage(),
								MissingChallengeError: () => new HttpApiError.BadRequest(),
								PersistenceError: () => new InsufficientStorage(),
								TooManyChallengeAttemptsError: () => new HttpApiError.BadRequest(),
								UnavailableChallengeError: () => new HttpApiError.BadRequest(),
							}),
						);

					const userId = yield* user.system
						.findByEmail(challenge.email)
						.pipe(
							Effect.flatMap(
								Option.match({
									onNone: () => user.system.create({ email: challenge.email, language: challenge.language }),
									onSome: (user) => Effect.succeed(user.id),
								}),
							),
						);

					const userSession = yield* session.system.create({ deviceLabel: context.payload.deviceLabel, userId });

					return userSession;
				}),
			);
	}),
).pipe(Layer.provide([Session.Live, EmailChallenge.Live, User.Live, AuthenticatorLive, ClusterRunnerLive]));

export const NaamioApiServerLive = HttpApiBuilder.api(NaamioApi).pipe(Layer.provide(AuthenticationGroupLive));
