import { SqlSchema } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { Config, Context, DateTime, Duration, Effect, Layer, Option, Redacted, Schema } from "effect";
import { customAlphabet } from "nanoid";

import type { TransactionId } from "@naamio/schema/domain";

import { CurrentSession } from "@naamio/api/middlewares/authenticated-only";
import { generateHmacSignature, verifyHmacSignature } from "@naamio/hmac";
import { generateId } from "@naamio/id-generator/effect";
import { SessionModel } from "@naamio/schema/domain";

import { STANDARD_ID_ALPHABET } from "#src/features/auth/constants.js";
import { DatabaseLive } from "#src/lib/database/mod.js";
import { createGetTransactionId } from "#src/lib/database/utilities.js";

const SESSION_EXPIRATION_DURATION = Duration.days(30);
const SESSION_EXTENSION_CUTOFF_DURATION = Duration.unsafeDivide(SESSION_EXPIRATION_DURATION, 2);

export class UnavailableSessionError extends Schema.TaggedError<UnavailableSessionError>(
	"@naamio/mercury/Session/UnavailableSessionError",
)("UnavailableSessionError", {}) {}

export class MissingSessionError extends Schema.TaggedError<MissingSessionError>(
	"@naamio/mercury/Session/MissingSessionError",
)("MissingSessionError", {}) {}

export class Session extends Context.Tag("@naamio/mercury/Session")<
	Session,
	{
		system: {
			create: (
				data: Pick<SessionModel, "deviceLabel" | "userId">,
			) => Effect.Effect<{ expiresAt: SessionModel["expiresAt"]; token: Redacted.Redacted }>;
			retrieveFromToken: (
				token: Redacted.Redacted,
			) => Effect.Effect<Option.Option<Pick<SessionModel, "expiresAt" | "id" | "userId">>>;
		};
		viewer: {
			revoke: (
				id: SessionModel["id"],
			) => Effect.Effect<
				{ transactionId: TransactionId },
				MissingSessionError | UnavailableSessionError,
				CurrentSession
			>;
			revokeAll: () => Effect.Effect<void, never, CurrentSession>;
			verify: () => Effect.Effect<
				Pick<SessionModel, "expiresAt" | "id"> & { refreshed: boolean },
				never,
				CurrentSession
			>;
		};
	}
>() {
	static Live = Layer.effect(
		this,
		Effect.gen(function* () {
			const SESSION_VALUE_SECRET = yield* Config.redacted("AUTH_SESSION_VALUE_SECRET");

			const sql = yield* PgClient.PgClient;

			const generateSessionValue = customAlphabet(STANDARD_ID_ALPHABET, 32);

			const getTransactionId = yield* createGetTransactionId();

			const insertSession = SqlSchema.void({
				execute: (request) => sql`
					INSERT INTO
						${sql("session")} ${sql.insert(request)};
				`,
				Request: SessionModel.insert,
			});

			const findByIdForRetrievalFromToken = SqlSchema.findOne({
				execute: (request) => sql`
					SELECT
						${sql("id")},
						${sql("userId")},
						${sql("signature")},
						${sql("expiresAt")},
						${sql("revokedAt")}
					FROM
						${sql("session")}
					WHERE
						${sql("id")} = ${request};
				`,
				Request: SessionModel.fields.id,
				Result: SessionModel.select.pick("id", "userId", "signature", "expiresAt", "revokedAt"),
			});

			const findByIdForRevocation = SqlSchema.findOne({
				execute: (request) => sql`
					SELECT
						${sql("id")},
						${sql("expiresAt")},
						${sql("revokedAt")}
					FROM
						${sql("session")}
					WHERE
						${sql.and([sql`${sql("id")} = ${request.id}`, sql`${sql("userId")} = ${request.userId}`])}
					FOR UPDATE;
				`,
				Request: SessionModel.update.pick("userId", "id"),
				Result: SessionModel.select.pick("id", "expiresAt", "revokedAt"),
			});

			const revokeSession = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("session")}
					SET
						${sql.update(request, ["id", "userId"])}
					WHERE
						${sql.and([sql`${sql("id")} = ${request.id}`, sql`${sql("userId")} = ${request.userId}`])};
				`,
				Request: SessionModel.update.pick("userId", "id", "revokedAt"),
			});

			const revokeAllSessions = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("session")}
					SET
						${sql.update(request, ["userId"])}
					WHERE
						${sql.and([
							sql`${sql("userId")} = ${request.userId}`,
							sql`${sql("revokedAt")} IS NULL`,
							sql`${sql("expiresAt")} > NOW()`,
						])};
				`,
				Request: SessionModel.update.pick("userId", "revokedAt"),
			});

			const updateSessionExpiration = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("session")}
					SET
						${sql.update(request, ["userId", "id"])}
					WHERE
						${sql.and([sql`${sql("userId")} = ${request.userId}`, sql`${sql("id")} = ${request.id}`])};
				`,
				Request: SessionModel.update.pick("userId", "expiresAt", "id"),
			});

			return Session.of({
				system: {
					create: Effect.fn("@naamio/mercury/Session#create")(function* (data) {
						const id = SessionModel.fields.id.make(yield* generateId());
						const expiresAt = yield* DateTime.now.pipe(Effect.map(DateTime.addDuration(SESSION_EXPIRATION_DURATION)));
						const value = generateSessionValue();
						const signature = yield* generateHmacSignature(value, SESSION_VALUE_SECRET);
						const token = Redacted.make(`${id}.${value}`);

						yield* insertSession({
							createdAt: undefined,
							deviceLabel: data.deviceLabel,
							expiresAt,
							id,
							revokedAt: Option.none(),
							signature,
							userId: data.userId,
						}).pipe(Effect.orDie);

						return { expiresAt, token };
					}),
					retrieveFromToken: Effect.fn("@naamio/mercury/Session#retrieveFromToken")(function* (token) {
						const unredactedToken = Redacted.value(token);
						const lastDotIndex = unredactedToken.lastIndexOf(".");
						const maybeId = Schema.decodeOption(SessionModel.fields.id)(unredactedToken.slice(0, lastDotIndex));
						const value = unredactedToken.slice(lastDotIndex + 1);

						if (Option.isNone(maybeId)) {
							return Option.none();
						}

						const maybeSession = yield* findByIdForRetrievalFromToken(maybeId.value).pipe(Effect.orDie);

						if (Option.isNone(maybeSession)) {
							return Option.none();
						}

						const isValidValue = yield* verifyHmacSignature(value, maybeSession.value.signature, SESSION_VALUE_SECRET);

						if (!isValidValue) {
							return Option.none();
						}

						const isRevoked = Option.isSome(maybeSession.value.revokedAt);
						const isExpired = yield* DateTime.isPast(maybeSession.value.expiresAt);

						if (isRevoked || isExpired) {
							return Option.none();
						}

						return Option.some({
							expiresAt: maybeSession.value.expiresAt,
							id: maybeSession.value.id,
							userId: maybeSession.value.userId,
						});
					}),
				},
				viewer: {
					revoke: Effect.fn("@naamio/mercury/Session#revoke")(
						function* (id) {
							const currentSession = yield* CurrentSession;

							const maybeSession = yield* findByIdForRevocation({ id, userId: currentSession.userId }).pipe(
								Effect.orDie,
							);

							if (Option.isNone(maybeSession)) {
								return yield* new MissingSessionError();
							}

							const isRevoked = Option.isSome(maybeSession.value.revokedAt);
							const isExpired = yield* DateTime.isPast(maybeSession.value.expiresAt);

							if (isRevoked || isExpired) {
								return yield* new UnavailableSessionError();
							}

							yield* revokeSession({
								id: maybeSession.value.id,
								revokedAt: Option.some(yield* DateTime.now),
								userId: currentSession.userId,
							}).pipe(Effect.orDie);

							const transactionId = yield* getTransactionId().pipe(Effect.orDie);

							return { transactionId };
						},
						sql.withTransaction,
						Effect.catchTag("SqlError", (error) => Effect.die(error)),
					),
					revokeAll: Effect.fn("@naamio/mercury/Session#revokeAll")(function* () {
						const currentSession = yield* CurrentSession;

						yield* revokeAllSessions({
							revokedAt: Option.some(yield* DateTime.now),
							userId: currentSession.userId,
						}).pipe(Effect.orDie);
					}),
					verify: Effect.fn("@naamio/mercury/Session#verify")(function* () {
						const currentSession = yield* CurrentSession;

						const extensionCutoff = yield* DateTime.now.pipe(
							Effect.map(DateTime.addDuration(SESSION_EXTENSION_CUTOFF_DURATION)),
						);

						const isWithinExtensionCutoff = DateTime.lessThanOrEqualTo(currentSession.expiresAt, extensionCutoff);

						if (!isWithinExtensionCutoff) {
							return { expiresAt: currentSession.expiresAt, id: currentSession.id, refreshed: false };
						}

						const newExpiration = yield* DateTime.now.pipe(
							Effect.map(DateTime.addDuration(SESSION_EXPIRATION_DURATION)),
						);

						yield* updateSessionExpiration({
							expiresAt: newExpiration,
							id: currentSession.id,
							userId: currentSession.userId,
						}).pipe(Effect.orDie);

						return { expiresAt: newExpiration, id: currentSession.id, refreshed: true };
					}),
				},
			});
		}),
	).pipe(Layer.provide(DatabaseLive)) satisfies Layer.Layer<Session, unknown>;
}
