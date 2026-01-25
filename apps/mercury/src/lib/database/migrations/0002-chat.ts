import type { ResolvedMigration } from "@effect/sql/Migrator";

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
			${sql("userId")} TEXT NOT NULL,
			FOREIGN KEY (${sql("userId")}) REFERENCES ${sql("user")} (${sql("id")})
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("message")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("role")} TEXT NOT NULL,
			${sql("status")} TEXT NULL,
			${sql("parentId")} TEXT NULL,
			${sql("conversationId")} TEXT NOT NULL,
			${sql("userId")} TEXT NOT NULL,
			FOREIGN KEY (${sql("parentId")}) REFERENCES ${sql("message")} (${sql("id")}),
			FOREIGN KEY (${sql("conversationId")}) REFERENCES ${sql("conversation")} (${sql("id")}),
			FOREIGN KEY (${sql("userId")}) REFERENCES ${sql("user")} (${sql("id")})
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("messagePart")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("messageId")} TEXT NOT NULL,
			${sql("type")} TEXT NOT NULL,
			${sql("data")} JSONB NOT NULL,
			${sql("userId")} TEXT NOT NULL,
			FOREIGN KEY (${sql("messageId")}) REFERENCES ${sql("message")} (${sql("id")}),
			FOREIGN KEY (${sql("userId")}) REFERENCES ${sql("user")} (${sql("id")})
		);
	`;
});

export const chatMigration = [2, "chat", Effect.succeed(migration)] satisfies ResolvedMigration;
