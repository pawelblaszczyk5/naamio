import type { HttpApi } from "@effect/platform";

import { FetchHttpClient, HttpApiClient } from "@effect/platform";
import { Config, Context, Effect, Layer } from "effect";

import { NaamioApi } from "@naamio/api";

type Groups = typeof NaamioApi extends HttpApi.HttpApi<any, infer Groups, any> ? Groups : never;
type Errors = typeof NaamioApi extends HttpApi.HttpApi<any, any, infer Errors> ? Errors : never;

export class NaamioApiClient extends Context.Tag("@naamio/gaia/NaamioApiClient")<
	NaamioApiClient,
	HttpApiClient.Client<Groups, Errors, never>
>() {
	static Live = Layer.effect(
		NaamioApiClient,
		Effect.gen(function* () {
			const API_BASE_URL = yield* Config.string("API_BASE_URL");

			return yield* HttpApiClient.make(NaamioApi, { baseUrl: API_BASE_URL });
		}),
	).pipe(Layer.provide(FetchHttpClient.layer));
}
