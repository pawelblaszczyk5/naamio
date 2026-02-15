import type { Migrator } from "@effect/sql";

import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";

const migration = Effect.gen(function* () {
	const sql = yield* PgClient.PgClient;

	yield* sql`
		CREATE TABLE ${sql("conversation")} (
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("id")} TEXT PRIMARY KEY,
			${sql("title")} TEXT NULL,
			${sql("updatedAt")} TIMESTAMPTZ NOT NULL,
			${sql("accessedAt")} TIMESTAMPTZ NOT NULL,
			${sql("userId")} TEXT NOT NULL REFERENCES ${sql("user")} (${sql("id")})
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("message")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("role")} TEXT NOT NULL,
			${sql("status")} TEXT NULL,
			${sql("parentId")} TEXT NULL REFERENCES ${sql("message")} (${sql("id")}),
			${sql("conversationId")} TEXT NOT NULL REFERENCES ${sql("conversation")} (${sql("id")}),
			${sql("userId")} TEXT NOT NULL REFERENCES ${sql("user")} (${sql("id")})
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("messagePart")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("messageId")} TEXT NOT NULL REFERENCES ${sql("message")} (${sql("id")}),
			${sql("type")} TEXT NOT NULL,
			${sql("data")} JSONB NOT NULL,
			${sql("userId")} TEXT NOT NULL REFERENCES ${sql("user")} (${sql("id")})
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("inflightChunk")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("messagePartId")} TEXT NOT NULL REFERENCES ${sql("messagePart")} (${sql("id")}),
			${sql("content")} TEXT NOT NULL,
			${sql("sequence")} SMALLINT NOT NULL,
			${sql("userId")} TEXT NOT NULL REFERENCES ${sql("user")} (${sql("id")})
		);
	`;
});

export const chatMigration = [2, "chat", Effect.succeed(migration)] satisfies Migrator.ResolvedMigration;
