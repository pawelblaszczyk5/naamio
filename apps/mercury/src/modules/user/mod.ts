import type { Option } from "effect";

import { SqlSchema } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { Context, Effect, Layer } from "effect";

import { generateId } from "@naamio/id-generator/effect";
import { UserModel } from "@naamio/schema";

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

			const insertUser = SqlSchema.single({
				execute: (request) => sql`
					INSERT INTO
						${sql("user")} ${sql.insert(request)}
					RETURNING
						${sql("id")};
				`,
				Request: UserModel.insert,
				Result: UserModel.select.pick("id"),
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

			return {
				system: {
					create: Effect.fn("@naamio/mercury/User#create")(function* (data) {
						const publicId = UserModel.fields.publicId.make(yield* generateId());

						const inserted = yield* insertUser({
							createdAt: undefined,
							email: data.email,
							language: data.language,
							publicId,
						}).pipe(Effect.orDie);

						return inserted.id;
					}),
					findByEmail: Effect.fn("@naamio/mercury/User#findByEmail")(function* (email) {
						return yield* findByEmail(email).pipe(Effect.orDie);
					}),
				},
			} satisfies User["Type"];
		}),
	).pipe(Layer.provide(DatabaseLive)) satisfies Layer.Layer<User, unknown>;
}
