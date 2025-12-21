import { NodeContext } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";
import { Config, Effect, Layer } from "effect";

import { allMigrations } from "#src/modules/database/migrations/mod.js";

const PostgresLive = PgClient.layerConfig({
	database: Config.string("POSTGRES_DATABASE"),
	host: Config.string("POSTGRES_HOST"),
	password: Config.redacted("POSTGRES_PASSWORD"),
	port: Config.number("POSTGRES_PORT"),
	username: Config.string("POSTGRES_USERNAME"),
});

const MigratorLive = PgMigrator.layer({ loader: Effect.succeed(allMigrations) }).pipe(
	Layer.provide(NodeContext.layer),
	Layer.provideMerge(PostgresLive),
);

export const DatabaseLive = Layer.mergeAll(MigratorLive);
