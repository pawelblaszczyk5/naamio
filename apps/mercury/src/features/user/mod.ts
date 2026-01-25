import type { Option } from "effect";

import { SqlSchema } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { Context, Effect, Layer } from "effect";

import type { TransactionId } from "@naamio/schema/domain";

import { CurrentSession } from "@naamio/api/middlewares/authenticated-only";
import { generateId } from "@naamio/id-generator/effect";
import { UserModel } from "@naamio/schema/domain";

import { DatabaseLive } from "#src/lib/database/mod.js";
import { createGetTransactionId } from "#src/lib/database/utilities.js";

export class User extends Context.Tag("@naamio/mercury/User")<
	User,
	{
		system: {
			create: (data: Pick<UserModel, "email" | "language">) => Effect.Effect<UserModel["id"]>;
			findByEmail: (email: UserModel["email"]) => Effect.Effect<Option.Option<Pick<UserModel, "email" | "id">>>;
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

			const findByEmail = SqlSchema.findOne({
				execute: (request) => sql`
					SELECT
						${sql("id")},
						${sql("email")}
					FROM
						${sql("user")}
					WHERE
						${sql("email")} = ${request}
				`,
				Request: UserModel.fields.email,
				Result: UserModel.select.pick("id", "email"),
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
					create: Effect.fn("@naamio/mercury/User#create")(function* (data) {
						const id = UserModel.fields.id.make(yield* generateId());

						yield* insertUser({ createdAt: undefined, email: data.email, id, language: data.language }).pipe(
							Effect.orDie,
						);

						return id;
					}),
					findByEmail: Effect.fn("@naamio/mercury/User#findByEmail")(function* (email) {
						return yield* findByEmail(email).pipe(Effect.orDie);
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
