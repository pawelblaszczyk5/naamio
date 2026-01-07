import { Entity } from "@effect/cluster";
import { RateLimiter } from "@effect/experimental";
import { Rpc } from "@effect/rpc";
import { Duration, Effect, Layer, Schema } from "effect";

import { EmailChallengeCode, EmailChallengeModel } from "@naamio/schema/domain";

import {
	ChallengeRefreshUnavailableError,
	EmailChallenge,
	InvalidChallengeAttemptError,
	MissingChallengeError,
	TooManyChallengeAttemptsError,
	UnavailableChallengeError,
} from "#src/modules/auth/email-challenge.js";
import { ClusterRunnerLive } from "#src/modules/cluster/mod.js";

export class TooManyAuthenticatorRequestsError extends Schema.TaggedError<TooManyAuthenticatorRequestsError>(
	"@naamio/mercury/Authenticator/TooManyAuthenticatorRequestsError",
)("TooManyAuthenticatorRequestsError", {}) {}

export const Authenticator = Entity.make("Authenticator", [
	Rpc.make("InitializeChallenge", {
		error: TooManyAuthenticatorRequestsError,
		payload: EmailChallengeModel.insert.pick("language"),
		success: EmailChallengeModel.select.pick("state", "expiresAt"),
	}),
	Rpc.make("SolveChallenge", {
		error: Schema.Union(
			MissingChallengeError,
			UnavailableChallengeError,
			InvalidChallengeAttemptError,
			TooManyChallengeAttemptsError,
		),
		payload: Schema.extend(EmailChallengeModel.select.pick("state"))(Schema.Struct({ code: EmailChallengeCode })),
	}),
	Rpc.make("RefreshChallenge", {
		error: Schema.Union(
			TooManyAuthenticatorRequestsError,
			ChallengeRefreshUnavailableError,
			MissingChallengeError,
			UnavailableChallengeError,
		),
		payload: EmailChallengeModel.select.pick("state"),
		success: EmailChallengeModel.select.pick("state", "expiresAt"),
	}),
]);

export const AuthenticatorLive = Authenticator.toLayer(
	Effect.gen(function* () {
		const entityAddress = yield* Entity.CurrentAddress;

		const emailChallenge = yield* EmailChallenge;
		const withRateLimiter = yield* RateLimiter.makeWithRateLimiter;

		const email = yield* Schema.decodeUnknown(EmailChallengeModel.insert.fields.email)(entityAddress.entityId).pipe(
			Effect.orDie,
		);

		const withChallengeInitializationShortRateLimit = withRateLimiter({
			algorithm: "token-bucket",
			key: `${email}-challenge-initialization-short`,
			limit: 4,
			window: Duration.minutes(5),
		});

		const withChallengeInitializationLongRateLimit = withRateLimiter({
			algorithm: "token-bucket",
			key: `${email}-challenge-initialization-long`,
			limit: 8,
			window: Duration.hours(1),
		});

		return {
			InitializeChallenge: Effect.fn("@naamio/mercury/Authenticator#InitializeChallenge")(
				function* (request) {
					const result = yield* emailChallenge.system.initialize({ email, language: request.payload.language });

					return result;
				},
				withChallengeInitializationShortRateLimit,
				withChallengeInitializationLongRateLimit,
				Effect.catchTag("RateLimiterError", () => new TooManyAuthenticatorRequestsError()),
			),
			RefreshChallenge: Effect.fn("@naamio/mercury/Authenticator#RefreshChallenge")(
				function* (request) {
					const result = yield* emailChallenge.system.refresh({ email, state: request.payload.state });

					return result;
				},
				withChallengeInitializationShortRateLimit,
				withChallengeInitializationLongRateLimit,
				Effect.catchTag("RateLimiterError", () => new TooManyAuthenticatorRequestsError()),
			),
			SolveChallenge: Effect.fn("@naamio/mercury/Authenticator#SolveChallenge")(function* (request) {
				yield* emailChallenge.system.solve({ code: request.payload.code, email, state: request.payload.state });
			}),
		};
	}),
	{ maxIdleTime: Duration.hours(1) },
).pipe(
	Layer.provide([
		EmailChallenge.Live,
		RateLimiter.layer.pipe(Layer.provide(RateLimiter.layerStoreMemory)),
		ClusterRunnerLive,
	]),
);
