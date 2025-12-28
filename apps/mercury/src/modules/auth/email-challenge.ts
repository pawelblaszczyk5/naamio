import { SqlSchema } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { hash, verify } from "@node-rs/argon2";
import { Config, Context, DateTime, Duration, Effect, Layer, Option, Redacted, Schema } from "effect";
import { customAlphabet } from "nanoid";

import { EmailChallengeModel } from "@naamio/schema";

import { STANDARD_ID_ALPHABET } from "#src/modules/auth/constants.js";
import { DatabaseLive } from "#src/modules/database/mod.js";

const EMAIL_CHALLENGE_EXPIRATION_DURATION = Duration.minutes(5);
const EMAIL_CHALLENGE_REFRESH_CUTOFF_DURATION = Duration.minutes(2);
const EMAIL_CHALLENGE_MAX_ATTEMPT_COUNT = 3;

const EMAIL_CHALLENGE_CODE_ALPHABET = "0123456789";

export class MissingChallengeError extends Schema.TaggedError<MissingChallengeError>(
	"@naamio/mercury/EmailChallenge/MissingChallengeError",
)("MissingChallengeError", {}) {}

export class UnavailableChallengeError extends Schema.TaggedError<UnavailableChallengeError>(
	"@naamio/mercury/EmailChallenge/UnavailableChallengeError",
)("UnavailableChallengeError", {}) {}

export class TooManyChallengeAttemptsError extends Schema.TaggedError<TooManyChallengeAttemptsError>(
	"@naamio/mercury/EmailChallenge/TooManyChallengeAttemptsError",
)("TooManyChallengeAttemptsError", {}) {}

export class ChallengeRefreshUnavailableError extends Schema.TaggedError<ChallengeRefreshUnavailableError>(
	"@naamio/mercury/EmailChallenge/ChallengeRefreshUnavailableError",
)("ChallengeRefreshUnavailableError", {}) {}

export class InvalidChallengeAttemptError extends Schema.TaggedError<InvalidChallengeAttemptError>(
	"@naamio/mercury/EmailChallenge/InvalidChallengeAttemptError",
)("InvalidChallengeAttemptError", {}) {}

export class EmailChallenge extends Context.Tag("@naamio/mercury/EmailChallenge")<
	EmailChallenge,
	{
		system: {
			attempt: (data: {
				code: Redacted.Redacted;
				state: EmailChallengeModel["state"];
			}) => Effect.Effect<
				EmailChallengeModel["email"],
				InvalidChallengeAttemptError | MissingChallengeError | TooManyChallengeAttemptsError | UnavailableChallengeError
			>;
			initialize: (email: EmailChallengeModel["email"]) => Effect.Effect<EmailChallengeModel["state"]>;
			refresh: (
				state: EmailChallengeModel["state"],
			) => Effect.Effect<
				EmailChallengeModel["state"],
				ChallengeRefreshUnavailableError | MissingChallengeError | UnavailableChallengeError
			>;
		};
	}
>() {
	static Live = Layer.effect(
		this,
		Effect.gen(function* () {
			const EMAIL_CHALLENGE_CODE_SECRET_ENCODED = yield* Config.redacted("AUTH_EMAIL_CHALLENGE_CODE_SECRET").pipe(
				Config.map((secret) => {
					const encoder = new TextEncoder();
					const raw = Redacted.value(secret);

					return Redacted.make(encoder.encode(raw));
				}),
			);

			const sql = yield* PgClient.PgClient;

			const generateEmailChallengeState = customAlphabet(STANDARD_ID_ALPHABET, 32);
			const generateEmailChallengeCode = customAlphabet(EMAIL_CHALLENGE_CODE_ALPHABET, 6);

			const insertEmailChallenge = SqlSchema.void({
				execute: (request) => sql`
					INSERT INTO
						${sql("EmailChallenge")} ${sql.insert(request)};
				`,
				Request: EmailChallengeModel.insert,
			});

			const findByStateForSolvingAttempt = SqlSchema.findOne({
				execute: (request) => sql`
					SELECT
						${sql("attemptCount")},
						${sql("consumedAt")},
						${sql("email")},
						${sql("expiresAt")},
						${sql("hash")},
						${sql("id")},
						${sql("revokedAt")}
					FROM
						${sql("emailChallenge")}
					WHERE
						${sql("state")} = ${request}
					FOR UPDATE;
				`,
				Request: EmailChallengeModel.fields.state,
				Result: EmailChallengeModel.select.pick(
					"attemptCount",
					"consumedAt",
					"email",
					"expiresAt",
					"hash",
					"id",
					"revokedAt",
				),
			});

			const findByStateForRefresh = SqlSchema.findOne({
				execute: (request) => sql`
					SELECT
						${sql("consumedAt")},
						${sql("createdAt")},
						${sql("email")},
						${sql("expiresAt")},
						${sql("id")},
						${sql("revokedAt")}
					FROM
						${sql("emailChallenge")}
					WHERE
						${sql("state")} = ${request}
					FOR UPDATE;
				`,
				Request: EmailChallengeModel.fields.state,
				Result: EmailChallengeModel.select.pick(
					"consumedAt",
					"createdAt",
					"email",
					"expiresAt",
					"hash",
					"id",
					"revokedAt",
				),
			});

			const increaseEmailChallengeAttemptCount = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("emailChallenge")}
					SET
						${sql("attemptCount")} = ${sql("attemptCount")} + 1
					WHERE
						${sql("state")} = ${request};
				`,
				Request: EmailChallengeModel.fields.id,
			});

			const consumeEmailChallenge = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("emailChallenge")}
					SET
						${sql.update(request, ["id"])}
					WHERE
						${sql("id")} = ${request.id};
				`,
				Request: EmailChallengeModel.update.pick("id", "consumedAt"),
			});

			const revokeEmailChallenge = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("emailChallenge")}
					SET
						${sql.update(request, ["id"])}
					WHERE
						${sql("id")} = ${request.id};
				`,
				Request: EmailChallengeModel.update.pick("id", "revokedAt"),
			});

			const verifyEmailChallengeCode = Effect.fn(function* (data: {
				code: Redacted.Redacted;
				hash: Redacted.Redacted;
			}) {
				return yield* Effect.promise(async (signal) =>
					verify(
						Redacted.value(data.hash),
						Redacted.value(data.code),
						{ secret: Redacted.value(EMAIL_CHALLENGE_CODE_SECRET_ENCODED) },
						signal,
					),
				);
			});

			const hashEmailChallengeCode = Effect.fn(function* (code: Redacted.Redacted) {
				return Redacted.make(
					yield* Effect.promise(async (signal) =>
						hash(Redacted.value(code), { secret: Redacted.value(EMAIL_CHALLENGE_CODE_SECRET_ENCODED) }, signal),
					),
				);
			});

			const isEmailChallengeAvailable = Effect.fn(function* (
				emailChallenge: Pick<EmailChallengeModel, "consumedAt" | "expiresAt" | "revokedAt">,
			) {
				const isExpired = yield* DateTime.isPast(emailChallenge.expiresAt);
				const isRevoked = Option.isSome(emailChallenge.revokedAt);
				const isConsumed = Option.isSome(emailChallenge.consumedAt);

				return !isExpired && !isRevoked && !isConsumed;
			});

			const createNewChallenge = Effect.fn(function* (email: EmailChallengeModel["email"]) {
				const state = Redacted.make(generateEmailChallengeState());
				const code = Redacted.make(generateEmailChallengeCode());
				const hash = yield* hashEmailChallengeCode(code);
				const expiresAt = yield* DateTime.now.pipe(
					Effect.map(DateTime.addDuration(EMAIL_CHALLENGE_EXPIRATION_DURATION)),
				);

				yield* insertEmailChallenge({
					attemptCount: 0,
					consumedAt: Option.none(),
					createdAt: undefined,
					email,
					expiresAt,
					hash,
					revokedAt: Option.none(),
					state,
				}).pipe(Effect.orDie);

				return { code, state };
			});

			const sendEmailChallenge = Effect.fn(function* (data: {
				code: Redacted.Redacted;
				email: EmailChallengeModel["email"];
			}) {
				yield* Effect.log("TEMPORARY LOGGING CODE, IMPLEMENT SENDING EMAIL", data.email, Redacted.value(data.code));
			});

			return {
				system: {
					attempt: Effect.fn("@naamio/mercury/EmailChallenge#attempt")(
						function* (data) {
							const maybeEmailChallenge = yield* findByStateForSolvingAttempt(data.state).pipe(Effect.orDie);

							if (Option.isNone(maybeEmailChallenge)) {
								return yield* new MissingChallengeError();
							}

							const isAvailable = yield* isEmailChallengeAvailable(maybeEmailChallenge.value);
							const hasTooManyAttempts = maybeEmailChallenge.value.attemptCount >= EMAIL_CHALLENGE_MAX_ATTEMPT_COUNT;

							if (!isAvailable) {
								return yield* new UnavailableChallengeError();
							}

							if (hasTooManyAttempts) {
								return yield* new TooManyChallengeAttemptsError();
							}

							yield* increaseEmailChallengeAttemptCount(maybeEmailChallenge.value.id).pipe(Effect.orDie);

							const isSuccessfulAttempt = yield* verifyEmailChallengeCode({
								code: data.code,
								hash: maybeEmailChallenge.value.hash,
							});

							if (!isSuccessfulAttempt) {
								return yield* new InvalidChallengeAttemptError();
							}

							yield* consumeEmailChallenge({
								consumedAt: Option.some(yield* DateTime.now),
								id: maybeEmailChallenge.value.id,
							}).pipe(Effect.orDie);

							return maybeEmailChallenge.value.email;
						},
						sql.withTransaction,
						Effect.catchTag("SqlError", (error) => Effect.die(error)),
					),
					initialize: Effect.fn("@naamio/mercury/EmailChallenge#initialize")(function* (email) {
						const result = yield* createNewChallenge(email);

						yield* sendEmailChallenge({ code: result.code, email });

						return result.state;
					}),
					refresh: Effect.fn("@naamio/mercury/EmailChallenge#refresh")(
						function* (state) {
							const maybeEmailChallenge = yield* findByStateForRefresh(state).pipe(Effect.orDie);

							if (Option.isNone(maybeEmailChallenge)) {
								return yield* new MissingChallengeError();
							}

							const isAvailable = yield* isEmailChallengeAvailable(maybeEmailChallenge.value);
							const isAfterRefreshCutoff = yield* DateTime.isPast(
								maybeEmailChallenge.value.createdAt.pipe(DateTime.addDuration(EMAIL_CHALLENGE_REFRESH_CUTOFF_DURATION)),
							);

							if (!isAvailable) {
								return yield* new UnavailableChallengeError();
							}

							if (!isAfterRefreshCutoff) {
								return yield* new ChallengeRefreshUnavailableError();
							}

							yield* revokeEmailChallenge({
								id: maybeEmailChallenge.value.id,
								revokedAt: Option.some(yield* DateTime.now),
							}).pipe(Effect.orDie);

							const result = yield* createNewChallenge(maybeEmailChallenge.value.email);

							yield* sendEmailChallenge({ code: result.code, email: maybeEmailChallenge.value.email });

							return result.state;
						},
						sql.withTransaction,
						Effect.catchTag("SqlError", (error) => Effect.die(error)),
					),
				},
			} satisfies EmailChallenge["Type"];
		}),
	).pipe(Layer.provide(DatabaseLive)) satisfies Layer.Layer<EmailChallenge, unknown>;
}
