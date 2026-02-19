import { PgClient, PgMigrator } from "@effect/sql-pg";
import { Config, Effect, Layer, String } from "effect";

import { allMigrations } from "#src/lib/database/migrations/mod.js";

const PostgresLayer = PgClient.layerConfig({
	database: Config.string("APP_POSTGRES_DATABASE"),
	host: Config.string("APP_POSTGRES_HOST"),
	password: Config.redacted("APP_POSTGRES_PASSWORD"),
	port: Config.number("APP_POSTGRES_PORT"),
	transformQueryNames: Config.succeed(String.camelToSnake),
	transformResultNames: Config.succeed(String.snakeToCamel),
	username: Config.string("APP_POSTGRES_USERNAME"),
});

const MigratorLayer = PgMigrator.layer({ loader: Effect.succeed(allMigrations) }).pipe(
	Layer.provideMerge(PostgresLayer),
);

export const DatabaseLayer = Layer.mergeAll(MigratorLayer);
