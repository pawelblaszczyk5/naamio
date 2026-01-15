import type { Option } from "effect";

import { SqlSchema } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { Context, Effect, Layer } from "effect";

import { generateId } from "@naamio/id-generator/effect";
import { UserModel } from "@naamio/schema/domain";

import { DatabaseLive } from "#src/modules/database/mod.js";

export class User extends Context.Tag("@naamio/mercury/User")<
	User,
	{
		system: {
			create: (data: Pick<UserModel, "email" | "language">) => Effect.Effect<UserModel["id"]>;
			findByEmail: (email: UserModel["email"]) => Effect.Effect<Option.Option<Pick<UserModel, "email" | "id">>>;
		};
	}
>() {
	static Live = Layer.effect(
		this,
		Effect.gen(function* () {
			const sql = yield* PgClient.PgClient;

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
			});
		}),
	).pipe(Layer.provide(DatabaseLive)) satisfies Layer.Layer<User, unknown>;
}
