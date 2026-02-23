import type { Migrator } from "effect/unstable/sql";

import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";

const migration = Effect.gen(function* () {
	const sql = yield* PgClient.PgClient;

	yield* sql`
		CREATE TABLE ${sql("user")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("webAuthnId")} TEXT NOT NULL UNIQUE,
			${sql("username")} TEXT NOT NULL UNIQUE,
			${sql("language")} TEXT NOT NULL,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("confirmedAt")} TIMESTAMPTZ NULL
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("passkey")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("credentialId")} TEXT NOT NULL UNIQUE,
			${sql("publicKey")} TEXT NOT NULL,
			${sql("counter")} INTEGER NOT NULL,
			${sql("deviceType")} TEXT NOT NULL,
			${sql("displayName")} TEXT NOT NULL,
			${sql("backedUp")} BOOLEAN NOT NULL,
			${sql("aaguid")} TEXT NOT NULL,
			${sql("transports")} TEXT NULL,
			${sql("userId")} TEXT NOT NULL REFERENCES ${sql("user")} (${sql("id")})
		)
	`;

	yield* sql`
		CREATE TABLE ${sql("session")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("deviceLabel")} TEXT NULL,
			${sql("expiresAt")} TIMESTAMPTZ NOT NULL,
			${sql("signature")} TEXT NOT NULL,
			${sql("revokedAt")} TIMESTAMPTZ NULL,
			${sql("userId")} TEXT NOT NULL REFERENCES ${sql("user")} (${sql("id")}),
			${sql("passkeyId")} TEXT NOT NULL REFERENCES ${sql("passkey")} (${sql("id")})
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("webAuthnChallenge")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("challengeValue")} TEXT NOT NULL,
			${sql("type")} TEXT NOT NULL,
			${sql("displayName")} TEXT NULL,
			${sql("expiresAt")} TIMESTAMPTZ NOT NULL,
			${sql("userId")} TEXT NULL REFERENCES ${sql("user")} (${sql("id")})
		);
	`;
});

export const initialAuthMigration = [1, "initial-auth", Effect.succeed(migration)] satisfies Migrator.ResolvedMigration;
