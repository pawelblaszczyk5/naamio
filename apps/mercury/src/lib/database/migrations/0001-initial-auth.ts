import type { ResolvedMigration } from "@effect/sql/Migrator";

import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";

const migration = Effect.gen(function* () {
	const sql = yield* PgClient.PgClient;

	yield* sql`
		CREATE TABLE ${sql("user")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("email")} TEXT NOT NULL UNIQUE,
			${sql("language")} TEXT NOT NULL,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("session")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("deviceLabel")} TEXT NULL,
			${sql("expiresAt")} TIMESTAMPTZ NOT NULL,
			${sql("signature")} TEXT NOT NULL,
			${sql("revokedAt")} TIMESTAMPTZ NULL,
			${sql("userId")} TEXT NOT NULL REFERENCES ${sql("user")} (${sql("id")})
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("emailChallenge")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("consumedAt")} TIMESTAMPTZ NULL,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("expiresAt")} TIMESTAMPTZ NOT NULL,
			${sql("refreshAvailableAt")} TIMESTAMPTZ NOT NULL,
			${sql("revokedAt")} TIMESTAMPTZ NULL,
			${sql("email")} TEXT NOT NULL,
			${sql("language")} TEXT NOT NULL,
			${sql("remainingAttempts")} SMALLINT NOT NULL,
			${sql("hash")} TEXT NOT NULL,
			${sql("state")} TEXT NOT NULL UNIQUE
		);
	`;
});

export const initialAuthMigration = [1, "initial-auth", Effect.succeed(migration)] satisfies ResolvedMigration;
