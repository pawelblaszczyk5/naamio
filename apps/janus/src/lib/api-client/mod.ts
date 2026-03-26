import { NodeHttpClient } from "@effect/platform-node";
import { Config, Effect, Layer, Option, ServiceMap } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";

import { NaamioApi } from "@naamio/api";

import { SessionToken } from "#src/lib/effect-bridge/context.js";

import "@tanstack/react-start/server-only";

type Groups = (typeof NaamioApi)["groups"][string];

type ApiId = (typeof NaamioApi)["identifier"];

export class NaamioHttpClient extends ServiceMap.Service<NaamioHttpClient, HttpClient.HttpClient>()(
	"@naamio/janus/NaamioHttpClient",
) {
	static layer = Layer.effect(
		this,
		Effect.gen(function* () {
			const API_BASE_URL = yield* Config.string("API_BASE_URL");

			const httpClient = (yield* HttpClient.HttpClient).pipe(
				HttpClient.mapRequest(HttpClientRequest.prependUrl(API_BASE_URL)),
				HttpClient.mapRequestEffect(
					Effect.fn(function* (request) {
						const maybeSessionToken = yield* Effect.serviceOption(SessionToken);

						if (Option.isNone(maybeSessionToken)) {
							return request;
						}

						return request.pipe(HttpClientRequest.bearerToken(maybeSessionToken.value));
					}),
				),
			);

			return NaamioHttpClient.of(httpClient);
		}),
	).pipe(Layer.provide(NodeHttpClient.layerNodeHttp)) satisfies Layer.Layer<NaamioHttpClient, unknown>;
}

export class NaamioUrlBuilder extends ServiceMap.Service<
	NaamioUrlBuilder,
	HttpApiClient.UrlBuilder<typeof NaamioApi>
>()("@naamio/janus/NaamioUrlBuilder") {
	static layer = Layer.effect(
		this,
		Effect.gen(function* () {
			return NaamioUrlBuilder.of(HttpApiClient.urlBuilder(NaamioApi));
		}),
	) satisfies Layer.Layer<NaamioUrlBuilder, unknown>;
}

export class NaamioApiClient extends ServiceMap.Service<
	NaamioApiClient,
	Effect.Success<ReturnType<typeof HttpApiClient.make<ApiId, Groups>>>
>()("@naamio/janus/NaamioApiClient") {
	static layer = Layer.effect(
		this,
		Effect.gen(function* () {
			const httpClient = yield* NaamioHttpClient;

			return NaamioApiClient.of(yield* HttpApiClient.makeWith(NaamioApi, { httpClient }));
		}),
	).pipe(Layer.provide(NaamioHttpClient.layer)) satisfies Layer.Layer<NaamioApiClient, unknown>;
}
