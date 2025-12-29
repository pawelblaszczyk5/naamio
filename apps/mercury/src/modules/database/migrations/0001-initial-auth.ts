import type { ResolvedMigration } from "@effect/sql/Migrator";

import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";

const migration = Effect.gen(function* () {
	const sql = yield* PgClient.PgClient;

	yield* sql`
		CREATE TABLE ${sql("user")} (
			${sql("id")} BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			${sql("publicId")} TEXT NOT NULL UNIQUE,
			${sql("email")} TEXT NOT NULL UNIQUE,
			${sql("language")} TEXT NOT NULL,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("session")} (
			${sql("id")} BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			${sql("publicId")} TEXT NOT NULL UNIQUE,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("deviceLabel")} TEXT NOT NULL,
			${sql("expiresAt")} TIMESTAMPTZ NOT NULL,
			${sql("signature")} TEXT NOT NULL,
			${sql("revokedAt")} TIMESTAMPTZ NULL,
			${sql("userId")} BIGINT NOT NULL,
			FOREIGN KEY (${sql("userId")}) REFERENCES ${sql("user")} (${sql("id")})
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("emailChallenge")} (
			${sql("id")} BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			${sql("attemptCount")} SMALLINT NOT NULL,
			${sql("consumedAt")} TIMESTAMPTZ NULL,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("expiresAt")} TIMESTAMPTZ NOT NULL,
			${sql("revokedAt")} TIMESTAMPTZ NULL,
			${sql("email")} TEXT NOT NULL,
			${sql("language")} TEXT NOT NULL,
			${sql("hash")} TEXT NOT NULL,
			${sql("state")} TEXT NOT NULL UNIQUE
		);
	`;
});

export const initialAuthMigration = [1, "initial-auth", Effect.succeed(migration)] satisfies ResolvedMigration;
