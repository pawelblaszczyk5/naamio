import type { Statement } from "effect/unstable/sql";

import { NodeHttpClient } from "@effect/platform-node";
import { PgClient } from "@effect/sql-pg";
import { Config, Effect, Layer, pipe, Redacted, Schema, ServiceMap } from "effect";
import { Headers, HttpClient, HttpClientRequest, HttpServerResponse } from "effect/unstable/http";

import type { ElectricProtocolQuery } from "@naamio/schema/api";

import { CurrentSession } from "@naamio/api/middlewares/authenticated-only";

import { DatabaseLayer } from "#src/lib/database/mod.js";

interface ShapeDefinition {
	columns: Array<Statement.Identifier>;
	table: Statement.Identifier;
	where: Statement.Statement<unknown>;
}

export class ShapeProxyError extends Schema.TaggedErrorClass<ShapeProxyError>(
	"@naamio/mercury/Electric/ShapeProxyError",
)("ShapeProxyError", {}) {}

export class Electric extends ServiceMap.Service<
	Electric,
	{
		viewer: {
			passkeyShape: (
				electricUrlParams: ElectricProtocolQuery,
			) => Effect.Effect<HttpServerResponse.HttpServerResponse, ShapeProxyError, CurrentSession>;
			sessionShape: (
				electricUrlParams: ElectricProtocolQuery,
			) => Effect.Effect<HttpServerResponse.HttpServerResponse, ShapeProxyError, CurrentSession>;
			userShape: (
				electricUrlParams: ElectricProtocolQuery,
			) => Effect.Effect<HttpServerResponse.HttpServerResponse, ShapeProxyError, CurrentSession>;
		};
	}
>()("@naamio/mercury/Electric") {
	static layer = Layer.effect(
		this,
		Effect.gen(function* () {
			const BASE_URL = yield* Config.string("ELECTRIC_BASE_URL");
			const SECRET = yield* Config.redacted("ELECTRIC_SECRET");

			const sql = yield* PgClient.PgClient;

			const httpClient = (yield* HttpClient.HttpClient).pipe(
				HttpClient.mapRequest(HttpClientRequest.prependUrl(BASE_URL)),
				HttpClient.mapRequest(HttpClientRequest.appendUrlParam("secret", Redacted.value(SECRET))),
			);

			const compileIdentifier = Effect.fn(function* (identifier: Statement.Identifier) {
				return sql`${identifier}`.compile()[0];
			});

			const mapColumns = Effect.fn(function* (columns: ShapeDefinition["columns"]) {
				return yield* Effect.forEach(
					columns,
					Effect.fn(function* (column) {
						return yield* compileIdentifier(column);
					}),
				).pipe(Effect.map((columns) => columns.join(",")));
			});

			const mapWhereClause = Effect.fn(function* (statement: Statement.Statement<unknown>) {
				const [where, params] = statement.compile();

				const mappedParams: Record<`params[${number}]`, string> = Object.fromEntries(
					params.map((value, index) => {
						const paramKey = `params[${(index + 1).toString()}]`;
						const stringifiedValue = String(value);

						return [paramKey, stringifiedValue];
					}),
				);

				return { where, ...mappedParams };
			});

			const proxy = Effect.fn(function* (request: HttpClientRequest.HttpClientRequest) {
				const response = yield* httpClient.execute(request).pipe(Effect.mapError(() => new ShapeProxyError({})));
				const headers = pipe(response.headers, Headers.remove("Content-Encoding"), Headers.remove("Content-Length"));

				return HttpServerResponse.stream(response.stream, { headers, status: response.status });
			});

			const mapShapeDefinitionIntoRequest = Effect.fn(function* (
				shapeDefinition: ShapeDefinition,
				electricUrlParams: ElectricProtocolQuery,
			) {
				return HttpClientRequest.get("/v1/shape", {
					urlParams: {
						...electricUrlParams,
						columns: yield* mapColumns(shapeDefinition.columns),
						table: yield* compileIdentifier(shapeDefinition.table),
						...(yield* mapWhereClause(shapeDefinition.where)),
					},
				});
			});

			return Electric.of({
				viewer: {
					passkeyShape: Effect.fn("@naamio/mercury/Electric#passkeyShape")(function* (electricUrlParams) {
						const currentSession = yield* CurrentSession;

						const shapeDefinition: ShapeDefinition = {
							columns: [
								sql("id"),
								sql("aaguid"),
								sql("backedUp"),
								sql("createdAt"),
								sql("deviceType"),
								sql("displayName"),
							],
							table: sql("passkey"),
							where: sql`${sql("userId")} = ${currentSession.userId}`,
						};

						const request = yield* mapShapeDefinitionIntoRequest(shapeDefinition, electricUrlParams);

						return yield* proxy(request);
					}),
					sessionShape: Effect.fn("@naamio/mercury/Electric#sessionShape")(function* (electricUrlParams) {
						const currentSession = yield* CurrentSession;

						const shapeDefinition: ShapeDefinition = {
							columns: [sql("id"), sql("expiresAt"), sql("deviceLabel"), sql("createdAt"), sql("passkeyId")],
							table: sql("session"),
							where: sql`
								${sql.and([sql`${sql("userId")} = ${currentSession.userId}`, sql`${sql("revokedAt")} IS NULL`])}
							`,
						};

						const request = yield* mapShapeDefinitionIntoRequest(shapeDefinition, electricUrlParams);

						return yield* proxy(request);
					}),
					userShape: Effect.fn("@naamio/mercury/Electric#userShape")(function* (electricUrlParams) {
						const currentSession = yield* CurrentSession;

						const shapeDefinition: ShapeDefinition = {
							columns: [sql("id"), sql("username"), sql("language")],
							table: sql("user"),
							where: sql`${sql("id")} = ${currentSession.userId}`,
						};

						const request = yield* mapShapeDefinitionIntoRequest(shapeDefinition, electricUrlParams);

						return yield* proxy(request);
					}),
				},
			});
		}),
	).pipe(Layer.provide([DatabaseLayer, NodeHttpClient.layerNodeHttp]));
}
