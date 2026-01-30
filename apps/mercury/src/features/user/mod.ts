import { SqlSchema } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { TransactionId } from "@naamio/schema/domain";

import { CurrentSession } from "@naamio/api/middlewares/authenticated-only";
import { generateId } from "@naamio/id-generator/effect";
import { UserModel } from "@naamio/schema/domain";

import { DatabaseLive } from "#src/lib/database/mod.js";
import { createGetTransactionId } from "#src/lib/database/utilities.js";

export class UsernameTakenError extends Schema.TaggedError<UsernameTakenError>(
	"@naamio/mercury/User/UsernameTakenError",
)("UsernameTakenError", {}) {}

// TODO[2026-02-01] Implement not confirmed users cleanup

export class User extends Context.Tag("@naamio/mercury/User")<
	User,
	{
		system: {
			confirm: (id: UserModel["id"]) => Effect.Effect<void>;
			create: (
				data: Pick<UserModel, "language" | "username">,
			) => Effect.Effect<Pick<UserModel, "id" | "username" | "webAuthnId">, UsernameTakenError>;
			findIdByUsername: (username: UserModel["username"]) => Effect.Effect<Option.Option<UserModel["id"]>>;
		};
		viewer: {
			updateLanguage: (
				language: UserModel["language"],
			) => Effect.Effect<{ transactionId: TransactionId }, never, CurrentSession>;
		};
	}
>() {
	static Live = Layer.effect(
		this,
		Effect.gen(function* () {
			const sql = yield* PgClient.PgClient;

			const getTransactionId = yield* createGetTransactionId();

			const insertUser = SqlSchema.void({
				execute: (request) => sql`
					INSERT INTO
						${sql("user")} ${sql.insert(request)};
				`,
				Request: UserModel.insert,
			});

			const findUserByUsername = SqlSchema.findOne({
				execute: (request) => sql`
					SELECT
						${sql("id")}
					FROM
						${sql("user")}
					WHERE
						${sql("username")} = ${request}
				`,
				Request: UserModel.select.fields.username,
				Result: UserModel.select.pick("id"),
			});

			const updateConfirmedAtForUserId = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("user")}
					SET
						${sql.update(request, ["id"])}
					WHERE
						${sql("id")} = ${request.id};
				`,
				Request: UserModel.update.pick("id", "confirmedAt"),
			});

			const updateLanguageForUserId = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("user")}
					SET
						${sql.update(request, ["id"])}
					WHERE
						${sql("id")} = ${request.id};
				`,
				Request: UserModel.select.pick("id", "language"),
			});

			return User.of({
				system: {
					confirm: Effect.fn("@naamio/mercury/User#confirm")(function* (id) {
						yield* updateConfirmedAtForUserId({ confirmedAt: Option.some(yield* DateTime.now), id }).pipe(Effect.orDie);
					}),
					create: Effect.fn("@naamio/mercury/User#create")(function* (data) {
						const maybeExistingUserWithUsername = yield* findUserByUsername(data.username).pipe(Effect.orDie);

						if (Option.isSome(maybeExistingUserWithUsername)) {
							return yield* new UsernameTakenError();
						}

						const id = UserModel.fields.id.make(yield* generateId());
						const webAuthnId = UserModel.fields.webAuthnId.make(yield* generateId());

						yield* insertUser({
							confirmedAt: Option.none(),
							createdAt: undefined,
							id,
							language: data.language,
							username: data.username,
							webAuthnId,
						}).pipe(Effect.orDie);

						return { id, username: data.username, webAuthnId };
					}),
					findIdByUsername: Effect.fn("@naamio/mercury/User#findIdByUsername")(function* (username) {
						return yield* findUserByUsername(username).pipe(Effect.map(Option.map((user) => user.id)), Effect.orDie);
					}),
				},
				viewer: {
					updateLanguage: Effect.fn("@naamio/mercury/User#updateLanguage")(
						function* (language) {
							const currentSession = yield* CurrentSession;

							yield* updateLanguageForUserId({ id: currentSession.userId, language }).pipe(Effect.orDie);

							const transactionId = yield* getTransactionId().pipe(Effect.orDie);

							return { transactionId };
						},
						sql.withTransaction,
						Effect.catchTag("SqlError", (error) => Effect.die(error)),
					),
				},
			});
		}),
	).pipe(Layer.provide(DatabaseLive)) satisfies Layer.Layer<User, unknown>;
}
