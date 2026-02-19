import { PgClient } from "@effect/sql-pg";
import { Config, Layer, String } from "effect";
import { ClusterWorkflowEngine, SingleRunner } from "effect/unstable/cluster";

const ClusterStorageLayer = PgClient.layerConfig({
	database: Config.string("CLUSTER_STORAGE_POSTGRES_DATABASE"),
	host: Config.string("CLUSTER_STORAGE_POSTGRES_HOST"),
	password: Config.redacted("CLUSTER_STORAGE_POSTGRES_PASSWORD"),
	port: Config.number("CLUSTER_STORAGE_POSTGRES_PORT"),
	transformQueryNames: Config.succeed(String.camelToSnake),
	transformResultNames: Config.succeed(String.snakeToCamel),
	username: Config.string("CLUSTER_STORAGE_POSTGRES_USERNAME"),
});

export const ClusterRunnerLayer = SingleRunner.layer({ runnerStorage: "sql" }).pipe(Layer.provide(ClusterStorageLayer));

export const WorkflowEngineLayer = ClusterWorkflowEngine.layer.pipe(Layer.provide(ClusterRunnerLayer));
