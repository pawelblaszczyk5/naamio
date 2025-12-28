import { NodeContext } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";
import { Config, Effect, Layer, String } from "effect";

import { allMigrations } from "#src/modules/database/migrations/mod.js";

const PostgresLive = PgClient.layerConfig({
	database: Config.string("APP_POSTGRES_DATABASE"),
	host: Config.string("APP_POSTGRES_HOST"),
	password: Config.redacted("APP_POSTGRES_PASSWORD"),
	port: Config.number("APP_POSTGRES_PORT"),
	transformQueryNames: Config.succeed(String.camelToSnake),
	transformResultNames: Config.succeed(String.snakeToCamel),
	username: Config.string("APP_POSTGRES_USERNAME"),
});

const MigratorLive = PgMigrator.layer({ loader: Effect.succeed(allMigrations) }).pipe(
	Layer.provide(NodeContext.layer),
	Layer.provideMerge(PostgresLive),
);

export const DatabaseLive = Layer.mergeAll(MigratorLive);
