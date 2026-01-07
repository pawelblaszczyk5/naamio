import { SqlSchema } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { hash, verify } from "@node-rs/argon2";
import { Config, Context, DateTime, Duration, Effect, Layer, Option, Redacted, Schema } from "effect";
import { customAlphabet } from "nanoid";

import { generateId } from "@naamio/id-generator/effect";
import { EmailChallengeModel } from "@naamio/schema/domain";

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
			findMetadata: (
				state: EmailChallengeModel["state"],
			) => Effect.Effect<
				Option.Option<
					Pick<EmailChallengeModel, "email" | "expiresAt" | "language" | "refreshAvailableAt" | "remainingAttempts">
				>
			>;
			initialize: (
				data: Pick<EmailChallengeModel, "email" | "language">,
			) => Effect.Effect<Pick<EmailChallengeModel, "expiresAt" | "state">>;
			refresh: (data: {
				email: EmailChallengeModel["email"];
				state: EmailChallengeModel["state"];
			}) => Effect.Effect<
				Pick<EmailChallengeModel, "expiresAt" | "state">,
				ChallengeRefreshUnavailableError | MissingChallengeError | UnavailableChallengeError
			>;
			solve: (data: {
				code: Redacted.Redacted;
				email: EmailChallengeModel["email"];
				state: EmailChallengeModel["state"];
			}) => Effect.Effect<
				void,
				InvalidChallengeAttemptError | MissingChallengeError | TooManyChallengeAttemptsError | UnavailableChallengeError
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
						${sql("emailChallenge")} ${sql.insert(request)};
				`,
				Request: EmailChallengeModel.insert,
			});

			const findByStateForMetadata = SqlSchema.findOne({
				execute: (request) => sql`
					SELECT
						${sql("remainingAttempts")},
						${sql("consumedAt")},
						${sql("refreshAvailableAt")},
						${sql("email")},
						${sql("expiresAt")},
						${sql("id")},
						${sql("revokedAt")},
						${sql("language")}
					FROM
						${sql("emailChallenge")}
					WHERE
						${sql("state")} = ${request};
				`,
				Request: EmailChallengeModel.fields.state,
				Result: EmailChallengeModel.select.pick(
					"remainingAttempts",
					"consumedAt",
					"refreshAvailableAt",
					"email",
					"expiresAt",
					"language",
					"id",
					"revokedAt",
				),
			});

			const findByStateForSolving = SqlSchema.findOne({
				execute: (request) => sql`
					SELECT
						${sql("remainingAttempts")},
						${sql("consumedAt")},
						${sql("email")},
						${sql("expiresAt")},
						${sql("hash")},
						${sql("id")},
						${sql("revokedAt")}
					FROM
						${sql("emailChallenge")}
					WHERE
						${sql.and([sql`${sql("state")} = ${request.state}`, sql`${sql("email")} = ${request.email}`])}
					FOR UPDATE;
				`,
				Request: EmailChallengeModel.select.pick("state", "email"),
				Result: EmailChallengeModel.select.pick(
					"remainingAttempts",
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
						${sql("refreshAvailableAt")},
						${sql("email")},
						${sql("expiresAt")},
						${sql("id")},
						${sql("revokedAt")},
						${sql("language")}
					FROM
						${sql("emailChallenge")}
					WHERE
						${sql.and([sql`${sql("state")} = ${request.state}`, sql`${sql("email")} = ${request.email}`])}
					FOR UPDATE;
				`,
				Request: EmailChallengeModel.select.pick("state", "email"),
				Result: EmailChallengeModel.select.pick(
					"consumedAt",
					"refreshAvailableAt",
					"email",
					"expiresAt",
					"id",
					"revokedAt",
					"language",
				),
			});

			const consumeEmailChallengeAttempt = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("emailChallenge")}
					SET
						${sql("remainingAttempts")} = ${sql("remainingAttempts")} - 1
					WHERE
						${sql("id")} = ${request};
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

			const createNewChallenge = Effect.fn(function* (data: {
				email: EmailChallengeModel["email"];
				language: EmailChallengeModel["language"];
			}) {
				const id = EmailChallengeModel.fields.id.make(yield* generateId());
				const state = Redacted.make(generateEmailChallengeState());
				const code = Redacted.make(generateEmailChallengeCode());
				const hash = yield* hashEmailChallengeCode(code);
				const now = yield* DateTime.now;
				const expiresAt = DateTime.addDuration(now, EMAIL_CHALLENGE_EXPIRATION_DURATION);
				const refreshAvailableAt = DateTime.addDuration(now, EMAIL_CHALLENGE_REFRESH_CUTOFF_DURATION);

				yield* insertEmailChallenge({
					consumedAt: Option.none(),
					createdAt: undefined,
					email: data.email,
					expiresAt,
					hash,
					id,
					language: data.language,
					refreshAvailableAt,
					remainingAttempts: EMAIL_CHALLENGE_MAX_ATTEMPT_COUNT,
					revokedAt: Option.none(),
					state,
				}).pipe(Effect.orDie);

				return { code, expiresAt, state };
			});

			const sendEmailChallenge = Effect.fn(function* (data: {
				code: Redacted.Redacted;
				email: EmailChallengeModel["email"];
				language: EmailChallengeModel["language"];
			}) {
				yield* Effect.log("TEMPORARY LOGGING CODE, IMPLEMENT SENDING EMAIL", data.email, Redacted.value(data.code));
			});

			return {
				system: {
					findMetadata: Effect.fn("@naamio/mercury/EmailChallenge#findMetadata")(function* (state) {
						const maybeEmailChallenge = yield* findByStateForMetadata(state).pipe(Effect.orDie);

						if (Option.isNone(maybeEmailChallenge)) {
							return Option.none();
						}

						const isAvailable = yield* isEmailChallengeAvailable(maybeEmailChallenge.value);

						if (!isAvailable) {
							return Option.none();
						}

						return Option.some({
							email: maybeEmailChallenge.value.email,
							expiresAt: maybeEmailChallenge.value.expiresAt,
							language: maybeEmailChallenge.value.language,
							refreshAvailableAt: maybeEmailChallenge.value.refreshAvailableAt,
							remainingAttempts: maybeEmailChallenge.value.remainingAttempts,
						});
					}),
					initialize: Effect.fn("@naamio/mercury/EmailChallenge#initialize")(function* (data) {
						const result = yield* createNewChallenge(data);

						yield* sendEmailChallenge({ code: result.code, email: data.email, language: data.language });

						return { expiresAt: result.expiresAt, state: result.state };
					}),
					refresh: Effect.fn("@naamio/mercury/EmailChallenge#refresh")(
						function* (data) {
							const maybeEmailChallenge = yield* findByStateForRefresh({ email: data.email, state: data.state }).pipe(
								Effect.orDie,
							);

							if (Option.isNone(maybeEmailChallenge)) {
								return yield* new MissingChallengeError();
							}

							const isAvailable = yield* isEmailChallengeAvailable(maybeEmailChallenge.value);
							const isAfterRefreshCutoff = yield* DateTime.isPast(maybeEmailChallenge.value.refreshAvailableAt);

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

							const result = yield* createNewChallenge({
								email: maybeEmailChallenge.value.email,
								language: maybeEmailChallenge.value.language,
							});

							yield* sendEmailChallenge({
								code: result.code,
								email: maybeEmailChallenge.value.email,
								language: maybeEmailChallenge.value.language,
							});

							return { expiresAt: result.expiresAt, state: result.state };
						},
						sql.withTransaction,
						Effect.catchTag("SqlError", (error) => Effect.die(error)),
					),
					solve: Effect.fn("@naamio/mercury/EmailChallenge#solve")(
						function* (data) {
							const maybeEmailChallenge = yield* findByStateForSolving({ email: data.email, state: data.state }).pipe(
								Effect.orDie,
							);

							if (Option.isNone(maybeEmailChallenge)) {
								return yield* new MissingChallengeError();
							}

							const isAvailable = yield* isEmailChallengeAvailable(maybeEmailChallenge.value);
							const hasAnyAttemptsLeft = maybeEmailChallenge.value.remainingAttempts > 0;

							if (!isAvailable) {
								return yield* new UnavailableChallengeError();
							}

							if (!hasAnyAttemptsLeft) {
								return yield* new TooManyChallengeAttemptsError();
							}

							yield* consumeEmailChallengeAttempt(maybeEmailChallenge.value.id).pipe(Effect.orDie);

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
						},
						sql.withTransaction,
						Effect.catchTag("SqlError", (error) => Effect.die(error)),
					),
				},
			} satisfies EmailChallenge["Type"];
		}),
	).pipe(Layer.provide(DatabaseLive)) satisfies Layer.Layer<EmailChallenge, unknown>;
}
