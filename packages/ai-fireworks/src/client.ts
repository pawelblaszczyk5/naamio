import type { Config, Redacted } from "effect";
import type { AiError } from "effect/unstable/ai";

import { Context, Effect, Function, Layer, Option, Result, Schema, Stream } from "effect";
import { Sse } from "effect/unstable/encoding";
import { HttpBody, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";

import { FireworksConfig } from "#src/config.js";
import { Errors } from "#src/internal/errors.js";
import { FireworksChatCompletionRequest } from "#src/internal/request-schema.js";
import { FireworksChatCompletionChunk, FireworksChatCompletionResponse } from "#src/internal/response-schema.js";

export type CreateResponseOptions = Omit<
	FireworksChatCompletionRequest,
	"contextLengthExceededBehavior" | "perfMetricsInResponse" | "safeTokenization" | "stream" | "streamOptions"
>;

export type ChatCompletionStreamEvent = "[DONE]" | FireworksChatCompletionChunk;

const decodeChatCompletionChunk = Schema.decodeResult(Schema.fromJsonString(FireworksChatCompletionChunk));

const decodeChatCompletionSseData = (data: string): Result.Result<ChatCompletionStreamEvent, unknown> => {
	if (data === "[DONE]") {
		return Result.succeed(data);
	}

	return decodeChatCompletionChunk(data);
};

export interface Service {
	readonly client: HttpClient.HttpClient;
	readonly createResponse: (
		options: CreateResponseOptions,
	) => Effect.Effect<
		[parsedResponse: FireworksChatCompletionResponse, rawResponse: HttpClientResponse.HttpClientResponse],
		AiError.AiError
	>;
	readonly createResponseStream: (
		options: CreateResponseOptions,
	) => Effect.Effect<
		[
			parsedStream: Stream.Stream<ChatCompletionStreamEvent, AiError.AiError>,
			rawResponse: HttpClientResponse.HttpClientResponse,
		],
		AiError.AiError
	>;
}

export class FireworksClient extends Context.Service<FireworksClient, Service>()(
	"@naamio/ai-fireworks/FireworksClient",
) {}

export interface Options {
	readonly apiKey: Redacted.Redacted;
	readonly apiUrl?: string | undefined;
	readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined;
}

export const make = Effect.fnUntraced(function* (options: Options) {
	const baseClient = yield* HttpClient.HttpClient;

	const httpClient = baseClient.pipe(
		HttpClient.mapRequest((request) =>
			request.pipe(
				HttpClientRequest.prependUrl(options.apiUrl ?? "https://api.fireworks.ai/inference/v1"),
				HttpClientRequest.bearerToken(options.apiKey),
				HttpClientRequest.acceptJson,
			),
		),
		options.transformClient ?? Function.identity,
	);

	const resolveHttpClient = Effect.map(FireworksConfig.getOrUndefined, (config) =>
		config?.transformClient === undefined ? httpClient : config.transformClient(httpClient),
	);

	const makeRequestBody = Effect.fnUntraced(function* (
		createResponseOptions: CreateResponseOptions,
		isStream: boolean,
	) {
		return FireworksChatCompletionRequest.make({
			...createResponseOptions,
			contextLengthExceededBehavior: Option.some("error"),
			perfMetricsInResponse: Option.some(true),
			stream: Option.some(isStream),
			streamOptions: isStream ? Option.some({ includeUsage: true }) : Option.none(),
		});
	});

	const encodeRequest = HttpBody.jsonSchema(FireworksChatCompletionRequest);
	const decodeResponse = HttpClientResponse.schemaBodyJson(FireworksChatCompletionResponse);

	return FireworksClient.of({
		client: httpClient,
		createResponse: Effect.fn(
			function* (createResponseOptions) {
				const client = yield* resolveHttpClient;
				const body = yield* encodeRequest(yield* makeRequestBody(createResponseOptions, false)).pipe(Effect.orDie);
				const rawResponse = yield* client.pipe(HttpClient.filterStatusOk).post("/chat/completions", { body });

				const parsedResponse = yield* decodeResponse(rawResponse);

				return [parsedResponse, rawResponse] satisfies Effect.Success<ReturnType<Service["createResponse"]>>;
			},
			Effect.catchTags({
				HttpClientError: (error) => Errors.mapHttpClientError(error, "createResponse"),
				SchemaError: (error) => Effect.fail(Errors.mapSchemaError(error, "createResponse")),
			}),
		),
		createResponseStream: Effect.fn(function* (createResponseOptions) {
			const client = yield* resolveHttpClient;
			const body = yield* encodeRequest(yield* makeRequestBody(createResponseOptions, true)).pipe(Effect.orDie);
			const rawResponse = yield* client
				.pipe(HttpClient.filterStatusOk)
				.post("/chat/completions", { body })
				.pipe(Effect.catchTag("HttpClientError", (error) => Errors.mapHttpClientError(error, "createResponseStream")));

			const stream = rawResponse.stream.pipe(
				Stream.decodeText(),
				Stream.pipeThroughChannel(Sse.decode()),
				Stream.map((event) => event.data),
				Stream.filterMap(decodeChatCompletionSseData),
				Stream.catchTags({
					HttpClientError: (error) => Stream.fromEffect(Errors.mapHttpClientError(error, "createResponseStream")),
					Retry: (error) => Stream.die(error),
				}),
			);

			return [stream, rawResponse] satisfies Effect.Success<ReturnType<Service["createResponseStream"]>>;
		}),
	});
});

export const layer = (options: Options) => Layer.effect(FireworksClient, make(options));

export const layerConfig = (options: {
	readonly apiKey: Config.Config<Options["apiKey"]>;
	readonly apiUrl?: Config.Config<NonNullable<Options["apiUrl"]>> | undefined;
	readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined;
}) =>
	Layer.effect(
		FireworksClient,
		Effect.gen(function* () {
			const apiKey = yield* options.apiKey;
			const apiUrl = options.apiUrl ? yield* options.apiUrl : undefined;

			return yield* make({
				apiKey,
				apiUrl,

				transformClient: options.transformClient,
			});
		}),
	);
