import type { HttpApi } from "@effect/platform";

import { FetchHttpClient, HttpApiClient, HttpClient, HttpClientRequest } from "@effect/platform";
import { Config, Context, Effect, Layer, Option } from "effect";

import { NaamioApi } from "@naamio/api";

import { SessionToken } from "#src/modules/effect-bridge/context.js";

type Groups = typeof NaamioApi extends HttpApi.HttpApi<any, infer Groups, any, any> ? Groups : never;
type Errors = typeof NaamioApi extends HttpApi.HttpApi<any, any, infer Errors, any> ? Errors : never;
type Requirements = typeof NaamioApi extends HttpApi.HttpApi<any, any, any, infer Requirements> ? Requirements : never;

export class NaamioApiClient extends Context.Tag("@naamio/janus/NaamioApiClient")<
	NaamioApiClient,
	HttpApiClient.Client<Groups, Errors, Requirements>
>() {
	static Live = Layer.effect(
		this,
		Effect.gen(function* () {
			const API_BASE_URL = yield* Config.string("API_BASE_URL");

			return yield* HttpApiClient.make(NaamioApi, {
				baseUrl: API_BASE_URL,
				transformClient: HttpClient.mapRequestEffect(
					Effect.fn(function* (request) {
						const maybeSessionToken = yield* Effect.serviceOption(SessionToken);

						if (Option.isNone(maybeSessionToken)) {
							return request;
						}

						return request.pipe(HttpClientRequest.bearerToken(maybeSessionToken.value));
					}),
				),
			});
		}),
	).pipe(Layer.provide(FetchHttpClient.layer)) satisfies Layer.Layer<NaamioApiClient, unknown>;
}
