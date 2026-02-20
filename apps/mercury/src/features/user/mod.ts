import { PgClient } from "@effect/sql-pg";
import { Cron, DateTime, Duration, Effect, Layer, Option, Schema, ServiceMap, Struct } from "effect";
import { ClusterCron } from "effect/unstable/cluster";
import { SqlSchema } from "effect/unstable/sql";

import type { TransactionId } from "@naamio/schema/domain";

import { CurrentSession } from "@naamio/api/middlewares/authenticated-only";
import { generateId } from "@naamio/id-generator/effect";
import { UserModel } from "@naamio/schema/domain";

import { ClusterRunnerLayer } from "#src/lib/cluster/mod.js";
import { DatabaseLayer } from "#src/lib/database/mod.js";
import { createGetTransactionId } from "#src/lib/database/utilities.js";

export class UsernameTakenError extends Schema.TaggedErrorClass<UsernameTakenError>(
	"@naamio/mercury/User/UsernameTakenError",
)("UsernameTakenError", {}) {}

export class User extends ServiceMap.Service<
	User,
	{
		system: {
			confirm: (id: UserModel["id"]) => Effect.Effect<void>;
			create: (
				data: Pick<UserModel, "language" | "username">,
			) => Effect.Effect<Pick<UserModel, "id" | "username" | "webAuthnId">, UsernameTakenError>;
			deleteUnconfirmedUsers: () => Effect.Effect<void>;
			findIdByUsername: (username: UserModel["username"]) => Effect.Effect<Option.Option<UserModel["id"]>>;
		};
		viewer: {
			updateLanguage: (
				language: UserModel["language"],
			) => Effect.Effect<{ transactionId: TransactionId }, never, CurrentSession>;
		};
	}
>()("@naamio/mercury/User") {
	static layer = Layer.effect(
		this,
		Effect.gen(function* () {
			const UNCONFIRMED_USERS_DELETION_CUTOFF = Duration.minutes(5);

			const sql = yield* PgClient.PgClient;

			const getTransactionId = yield* createGetTransactionId();

			const insertUser = SqlSchema.void({
				execute: (request) => sql`
					INSERT INTO
						${sql("user")} ${sql.insert(request)};
				`,
				Request: UserModel.insert,
			});

			const findUserByUsername = SqlSchema.findOneOption({
				execute: (request) => sql`
					SELECT
						${sql("id")}
					FROM
						${sql("user")}
					WHERE
						${sql("username")} = ${request}
				`,
				Request: UserModel.select.fields.username,
				Result: UserModel.select.mapFields(Struct.pick(["id"])),
			});

			const markUserAsConfirmed = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("user")}
					SET
						${sql.update(request, ["id"])}
					WHERE
						${sql("id")} = ${request.id};
				`,
				Request: UserModel.update.mapFields(Struct.pick(["id", "confirmedAt"])),
			});

			const updateUserLanguage = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("user")}
					SET
						${sql.update(request, ["id"])}
					WHERE
						${sql("id")} = ${request.id};
				`,
				Request: UserModel.select.mapFields(Struct.pick(["id", "language"])),
			});

			const deleteUnconfirmedUsersCreatedBefore = SqlSchema.void({
				execute: (request) => sql`
					DELETE FROM ${sql("user")}
					WHERE
						${sql.and([sql`${sql("createdAt")} < ${request}`, sql`${sql("confirmedAt")} IS NULL`])}
				`,
				Request: UserModel.fields.createdAt,
			});

			return User.of({
				system: {
					confirm: Effect.fn("@naamio/mercury/User#confirm")(function* (id) {
						yield* markUserAsConfirmed({ confirmedAt: Option.some(yield* DateTime.now), id }).pipe(
							Effect.catchTag(["SchemaError", "SqlError"], Effect.die),
						);
					}),
					create: Effect.fn("@naamio/mercury/User#create")(function* (data) {
						const maybeExistingUserWithUsername = yield* findUserByUsername(data.username).pipe(
							Effect.catchTag(["SchemaError", "SqlError"], Effect.die),
						);

						if (Option.isSome(maybeExistingUserWithUsername)) {
							return yield* new UsernameTakenError();
						}

						const id = UserModel.fields.id.makeUnsafe(yield* generateId());
						const webAuthnId = UserModel.fields.webAuthnId.makeUnsafe(yield* generateId());

						yield* insertUser({
							confirmedAt: Option.none(),
							createdAt: undefined,
							id,
							language: data.language,
							username: data.username,
							webAuthnId,
						}).pipe(Effect.catchTag(["SchemaError", "SqlError"], Effect.die));

						return { id, username: data.username, webAuthnId };
					}),
					deleteUnconfirmedUsers: Effect.fn("@naamio/mercury/User#deleteUnconfirmedUsers")(function* () {
						const cutoff = yield* DateTime.now.pipe(
							Effect.map(DateTime.subtractDuration(UNCONFIRMED_USERS_DELETION_CUTOFF)),
						);

						yield* deleteUnconfirmedUsersCreatedBefore(cutoff).pipe(
							Effect.catchTag(["SchemaError", "SqlError"], Effect.die),
						);
					}),
					findIdByUsername: Effect.fn("@naamio/mercury/User#findIdByUsername")(function* (username) {
						return yield* findUserByUsername(username).pipe(
							Effect.map(Option.map((user) => user.id)),
							Effect.catchTag(["SchemaError", "SqlError"], Effect.die),
						);
					}),
				},
				viewer: {
					updateLanguage: Effect.fn("@naamio/mercury/User#updateLanguage")(function* (language) {
						const currentSession = yield* CurrentSession;

						const transactionId = yield* Effect.gen(function* () {
							yield* updateUserLanguage({ id: currentSession.userId, language }).pipe(
								Effect.catchTag(["SchemaError", "SqlError"], Effect.die),
							);

							return yield* getTransactionId();
						}).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die));

						return { transactionId };
					}),
				},
			});
		}),
	).pipe(Layer.provide(DatabaseLayer)) satisfies Layer.Layer<User, unknown>;
}

export const CleanupUnconfirmedUsersCron = ClusterCron.make({
	cron: Cron.parseUnsafe("*/15 * * * *"),
	execute: Effect.gen(function* () {
		const user = yield* User;

		yield* user.system.deleteUnconfirmedUsers();
	}),
	name: "CleanupUnconfirmedUsersCron",
}).pipe(Layer.provide([ClusterRunnerLayer, User.layer]));
