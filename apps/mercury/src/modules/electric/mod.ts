import type { HttpClientError } from "@effect/platform";

import { FetchHttpClient, Headers, HttpClient, HttpClientRequest, HttpServerResponse } from "@effect/platform";
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { Config, Context, Effect, Layer, Redacted } from "effect";

export class Electric extends Context.Tag("@naamio/mercury/Electric")<
	Electric,
	{
		proxy: (
			shapeDefinition: { columns: Array<string>; table: string; where: string },
			urlParams: Record<string, string>,
		) => Effect.Effect<HttpServerResponse.HttpServerResponse, HttpClientError.HttpClientError>;
	}
>() {
	static Live = Layer.effect(
		this,
		Effect.gen(function* () {
			const BASE_URL = yield* Config.string("ELECTRIC_BASE_URL");
			const SECRET = yield* Config.redacted("ELECTRIC_SECRET");

			const httpClient = (yield* HttpClient.HttpClient).pipe(
				HttpClient.mapRequest(HttpClientRequest.prependUrl(BASE_URL)),
				HttpClient.mapRequest(HttpClientRequest.appendUrlParam("secret", Redacted.value(SECRET))),
			);

			return {
				proxy: Effect.fn("@naamio/mercury/Electric#proxy")(function* (shapeDefinition, urlParams) {
					const filteredOutParams = Object.fromEntries(
						Object.entries(urlParams).filter(([key]) => ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)),
					);

					const response = yield* httpClient.get("/v1/shape", {
						urlParams: {
							...filteredOutParams,
							columns: shapeDefinition.columns.join(","),
							table: shapeDefinition.table,
							where: shapeDefinition.where,
						},
					});

					const newHeaders = Headers.remove(response.headers, ["content-encoding", "content-length"]);

					const serverResponse = yield* HttpServerResponse.stream(response.stream, {
						headers: newHeaders,
						status: response.status,
					});

					return serverResponse;
				}),
			};
		}),
	).pipe(Layer.provide(FetchHttpClient.layer));
}
