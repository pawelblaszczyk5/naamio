import type { Schema, Tracer, Types } from "effect";
import type { Response } from "effect/unstable/ai";
import type { HttpClientRequest, HttpClientResponse } from "effect/unstable/http";

import {
	Context,
	DateTime,
	Duration,
	Effect,
	Encoding,
	Function,
	Layer,
	Option,
	Redactable,
	SchemaAST,
	Stream,
} from "effect";
import { AiError, LanguageModel, Model, OpenAiStructuredOutput, Tool } from "effect/unstable/ai";

import type { FireworksChatCompletionStreamEvent, FireworksCreateResponseOptions } from "#src/client.js";
import type {
	DeepseekReasoningEffort,
	FireworksChatCompletionRequest,
	FireworksMessage,
	FireworksStructuredOutputResponseFormat,
	FireworksTool,
	FireworksToolCall,
	FireworksToolChoice,
	FireworksUserContent,
	GlmReasoningEffort,
	KimiReasoningEffort,
	MiniMaxReasoningEffort,
	QwenReasoningEffort,
} from "#src/internal/request-schema.js";
import type {
	FireworksChatCompletionChunk,
	FireworksChatCompletionResponse,
	FireworksFinishReason,
	FireworksUsage,
} from "#src/internal/response-schema.js";

import { FireworksClient } from "#src/client.js";
import { addGenAIAnnotations } from "#src/telemetry.js";

type BaseFireworksLanguageModelConfig = Pick<
	FireworksChatCompletionRequest,
	| "contextLengthExceededBehavior"
	| "maxTokens"
	| "parallelToolCalls"
	| "promptCacheIsolationKey"
	| "promptCacheKey"
	| "reasoningHistory"
	| "serviceTier"
	| "temperature"
>;

type KimiModel = Extract<FireworksChatCompletionRequest["model"], "kimi-k2p6" | "kimi-k2p7-code">;
type DeepseekModel = Extract<FireworksChatCompletionRequest["model"], "deepseek-v4-flash" | "deepseek-v4-pro">;
type QwenModel = Extract<FireworksChatCompletionRequest["model"], "qwen3p7-plus">;
type GlmModel = Extract<FireworksChatCompletionRequest["model"], "glm-5p2">;
type MinimaxModel = Extract<FireworksChatCompletionRequest["model"], "minimax-m3">;

interface EmptyFireworksMetadata extends Record<PropertyKey, never> {}

declare module "effect/unstable/ai/Prompt" {
	export interface FilePartOptions extends ProviderOptions {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}

	export interface ReasoningPartOptions extends ProviderOptions {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}

	export interface ToolCallPartOptions extends ProviderOptions {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}

	export interface ToolResultPartOptions extends ProviderOptions {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}

	export interface TextPartOptions extends ProviderOptions {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}
}

declare module "effect/unstable/ai/Response" {
	export interface TextPartMetadata extends ProviderMetadata {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}

	export interface TextStartPartMetadata extends ProviderMetadata {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}

	export interface TextEndPartMetadata extends ProviderMetadata {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}

	export interface ReasoningPartMetadata extends ProviderMetadata {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}

	export interface ReasoningStartPartMetadata extends ProviderMetadata {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}

	export interface ReasoningDeltaPartMetadata extends ProviderMetadata {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}

	export interface ReasoningEndPartMetadata extends ProviderMetadata {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}

	export interface ToolCallPartMetadata extends ProviderMetadata {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}

	export interface DocumentSourcePartMetadata extends ProviderMetadata {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}

	export interface UrlSourcePartMetadata extends ProviderMetadata {
		readonly fireworks?: EmptyFireworksMetadata | null;
	}

	export interface FinishPartMetadata extends ProviderMetadata {
		readonly fireworks?: null | {
			performanceMetrics: { serverProcessingTime: number; serverTimeToFirstToken: number };
		};
	}
}

export class KimiConfig extends Context.Service<
	KimiConfig,
	Types.Simplify<
		BaseFireworksLanguageModelConfig & {
			readonly model: KimiModel;
			readonly reasoningEffort: Option.Option<KimiReasoningEffort>;
		}
	>
>()("@naamio/ai-fireworks/KimiConfig") {}

export const withKimiConfigOverride: {
	(
		overrides: typeof KimiConfig.Service,
	): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, KimiConfig>>;
	<A, E, R>(
		self: Effect.Effect<A, E, R>,
		overrides: typeof KimiConfig.Service,
	): Effect.Effect<A, E, Exclude<R, KimiConfig>>;
} = Function.dual<
	(
		overrides: typeof KimiConfig.Service,
	) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, KimiConfig>>,
	<A, E, R>(
		self: Effect.Effect<A, E, R>,
		overrides: typeof KimiConfig.Service,
	) => Effect.Effect<A, E, Exclude<R, KimiConfig>>
>(2, (self, overrides) =>
	Effect.flatMap(Effect.serviceOption(KimiConfig), (config) =>
		Effect.provideService(self, KimiConfig, { ...(config._tag === "Some" && config.value), ...overrides }),
	),
);

export class DeepseekConfig extends Context.Service<
	DeepseekConfig,
	Types.Simplify<
		BaseFireworksLanguageModelConfig & {
			readonly model: DeepseekModel;
			readonly reasoningEffort: Option.Option<DeepseekReasoningEffort>;
		}
	>
>()("@naamio/ai-fireworks/DeepseekConfig") {}

export const withDeepseekConfigOverride: {
	(
		overrides: typeof DeepseekConfig.Service,
	): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, DeepseekConfig>>;
	<A, E, R>(
		self: Effect.Effect<A, E, R>,
		overrides: typeof DeepseekConfig.Service,
	): Effect.Effect<A, E, Exclude<R, DeepseekConfig>>;
} = Function.dual<
	(
		overrides: typeof DeepseekConfig.Service,
	) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, DeepseekConfig>>,
	<A, E, R>(
		self: Effect.Effect<A, E, R>,
		overrides: typeof DeepseekConfig.Service,
	) => Effect.Effect<A, E, Exclude<R, DeepseekConfig>>
>(2, (self, overrides) =>
	Effect.flatMap(Effect.serviceOption(DeepseekConfig), (config) =>
		Effect.provideService(self, DeepseekConfig, { ...(config._tag === "Some" && config.value), ...overrides }),
	),
);

export class QwenConfig extends Context.Service<
	QwenConfig,
	Types.Simplify<
		BaseFireworksLanguageModelConfig & {
			readonly model: QwenModel;
			readonly reasoningEffort: Option.Option<QwenReasoningEffort>;
		}
	>
>()("@naamio/ai-fireworks/QwenConfig") {}

export const withQwenConfigOverride: {
	(
		overrides: typeof QwenConfig.Service,
	): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, QwenConfig>>;
	<A, E, R>(
		self: Effect.Effect<A, E, R>,
		overrides: typeof QwenConfig.Service,
	): Effect.Effect<A, E, Exclude<R, QwenConfig>>;
} = Function.dual<
	(
		overrides: typeof QwenConfig.Service,
	) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, QwenConfig>>,
	<A, E, R>(
		self: Effect.Effect<A, E, R>,
		overrides: typeof QwenConfig.Service,
	) => Effect.Effect<A, E, Exclude<R, QwenConfig>>
>(2, (self, overrides) =>
	Effect.flatMap(Effect.serviceOption(QwenConfig), (config) =>
		Effect.provideService(self, QwenConfig, { ...(config._tag === "Some" && config.value), ...overrides }),
	),
);

export class GlmConfig extends Context.Service<
	GlmConfig,
	Types.Simplify<
		BaseFireworksLanguageModelConfig & {
			readonly model: GlmModel;
			readonly reasoningEffort: Option.Option<GlmReasoningEffort>;
		}
	>
>()("@naamio/ai-fireworks/GlmConfig") {}

export const withGlmConfigOverride: {
	(
		overrides: typeof GlmConfig.Service,
	): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, GlmConfig>>;
	<A, E, R>(
		self: Effect.Effect<A, E, R>,
		overrides: typeof GlmConfig.Service,
	): Effect.Effect<A, E, Exclude<R, GlmConfig>>;
} = Function.dual<
	(
		overrides: typeof GlmConfig.Service,
	) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, GlmConfig>>,
	<A, E, R>(
		self: Effect.Effect<A, E, R>,
		overrides: typeof GlmConfig.Service,
	) => Effect.Effect<A, E, Exclude<R, GlmConfig>>
>(2, (self, overrides) =>
	Effect.flatMap(Effect.serviceOption(GlmConfig), (config) =>
		Effect.provideService(self, GlmConfig, { ...(config._tag === "Some" && config.value), ...overrides }),
	),
);

export class MinimaxConfig extends Context.Service<
	MinimaxConfig,
	Types.Simplify<
		BaseFireworksLanguageModelConfig & {
			readonly model: MinimaxModel;
			readonly reasoningEffort: Option.Option<MiniMaxReasoningEffort>;
		}
	>
>()("@naamio/ai-fireworks/MinimaxConfig") {}

export const withMinimaxConfigOverride: {
	(
		overrides: typeof MinimaxConfig.Service,
	): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, MinimaxConfig>>;
	<A, E, R>(
		self: Effect.Effect<A, E, R>,
		overrides: typeof MinimaxConfig.Service,
	): Effect.Effect<A, E, Exclude<R, MinimaxConfig>>;
} = Function.dual<
	(
		overrides: typeof MinimaxConfig.Service,
	) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, MinimaxConfig>>,
	<A, E, R>(
		self: Effect.Effect<A, E, R>,
		overrides: typeof MinimaxConfig.Service,
	) => Effect.Effect<A, E, Exclude<R, MinimaxConfig>>
>(2, (self, overrides) =>
	Effect.flatMap(Effect.serviceOption(MinimaxConfig), (config) =>
		Effect.provideService(self, MinimaxConfig, { ...(config._tag === "Some" && config.value), ...overrides }),
	),
);

type AnyFireworksLanguageModelConfig = BaseFireworksLanguageModelConfig & {
	readonly model: DeepseekModel | GlmModel | KimiModel | MinimaxModel | QwenModel;
	readonly reasoningEffort: Option.Option<DeepseekReasoningEffort | KimiReasoningEffort | MiniMaxReasoningEffort>;
};

const annotateRequest = (span: Tracer.Span, request: FireworksCreateResponseOptions): void => {
	addGenAIAnnotations(span, {
		fireworks: {
			request: {
				responseFormat: request.responseFormat.pipe(
					Option.map((format) => format.type),
					Option.getOrElse(() => "text"),
				),
				serviceTier: Option.getOrUndefined(request.serviceTier),
			},
		},
		operation: { name: "chat" },
		request: {
			maxTokens: Option.getOrUndefined(request.maxTokens),
			model: request.model,
			temperature: Option.getOrUndefined(request.temperature),
		},
		system: "fireworks",
	});
};

const annotateResponse = (span: Tracer.Span, response: FireworksChatCompletionResponse): void => {
	const finishReason = response.choices[0].finishReason;

	addGenAIAnnotations(span, {
		fireworks: {
			response: {
				serverProcessingTime: Duration.toMillis(response.performanceMetrics.serverProcessingTime),
				serverTimeToFirstToken: Duration.toMillis(response.performanceMetrics.serverTimeToFirstToken),
			},
		},
		response: { finishReasons: [finishReason], id: response.id, model: response.model },
		usage: { inputTokens: response.usage.promptTokens, outputTokens: response.usage.completionTokens },
	});
};

const annotateStreamResponse = (span: Tracer.Span, part: Response.StreamPartEncoded) => {
	if (part.type === "response-metadata") {
		addGenAIAnnotations(span, { fireworks: {}, response: { id: part.id, model: part.modelId } });

		return;
	}

	if (part.type === "finish") {
		const performanceMetrics = part.metadata?.fireworks?.performanceMetrics;

		addGenAIAnnotations(span, {
			fireworks: {
				response:
					performanceMetrics ?
						{
							serverProcessingTime: performanceMetrics.serverProcessingTime,
							serverTimeToFirstToken: performanceMetrics.serverTimeToFirstToken,
						}
					:	undefined,
			},
			response: { finishReasons: [part.reason] },
			usage: { inputTokens: part.usage.inputTokens.total, outputTokens: part.usage.outputTokens.total },
		});
	}
};

const resolveFinishReason = (
	finishReason: Option.Option<FireworksFinishReason>,
	hasToolCalls: boolean,
): Response.FinishReason => {
	if (Option.isNone(finishReason)) {
		return hasToolCalls ? "tool-calls" : "stop";
	}

	if (finishReason.value === "tool_calls") {
		return "tool-calls";
	}

	return finishReason.value;
};

const prepareMessages = Effect.fnUntraced(function* <Tools extends ReadonlyArray<Tool.Any>>({
	options,
	toolNameMapper,
}: {
	readonly options: LanguageModel.ProviderOptions;
	readonly toolNameMapper: Tool.NameMapper<Tools>;
}): Effect.fn.Return<ReadonlyArray<FireworksMessage>, AiError.AiError> {
	const messages: Array<FireworksMessage> = [];

	yield* Effect.forEach(
		options.prompt.content,
		Effect.fnUntraced(function* (message) {
			if (message.role === "system") {
				messages.push({ content: message.content, role: "system" });

				return;
			}

			if (message.role === "tool") {
				message.content.forEach((part) => {
					if (part.type === "tool-approval-response") {
						return;
					}

					messages.push({
						content: typeof part.result === "string" ? part.result : JSON.stringify(part.result),
						role: "tool",
						toolCallId: part.id,
					});
				});

				return;
			}

			if (message.role === "user") {
				const content: Array<FireworksUserContent> = [];

				yield* Effect.forEach(
					message.content,
					Effect.fnUntraced(function* (part) {
						if (part.type === "text") {
							content.push({ text: part.text, type: "text" });

							return;
						}

						if (!part.mediaType.startsWith("image/")) {
							return yield* AiError.make({
								method: "prepareMessages",
								module: "FireworksLanguageModel",
								reason: new AiError.InvalidRequestError({
									description: `Detected unsupported media type for file: '${part.mediaType}'`,
								}),
							});
						}

						const mediaType = part.mediaType === "image/*" ? "image/jpeg" : part.mediaType;

						if (part.data instanceof URL) {
							content.push({ imageUrl: { url: part.data.toString() }, type: "image_url" });
						}

						if (part.data instanceof Uint8Array) {
							const base64 = Encoding.encodeBase64(part.data);
							const dataUrl = `data:${mediaType};base64,${base64}`;

							content.push({ imageUrl: { url: dataUrl }, type: "image_url" });
						}
					}),
				);

				messages.push({ content, role: "user" });

				return;
			}

			let text = "";
			let reasoning = "";

			const toolCalls: Array<FireworksToolCall> = [];

			yield* Effect.forEach(
				message.content,
				Effect.fnUntraced(function* (part) {
					if (part.type === "text") {
						text += part.text;

						return;
					}

					if (part.type === "reasoning") {
						reasoning += part.text;

						return;
					}

					if (part.type === "tool-call") {
						const toolName = toolNameMapper.getProviderName(part.name);

						toolCalls.push({
							function: { arguments: JSON.stringify(part.params), name: toolName },
							id: part.id,
							type: "function",
						});

						return;
					}

					if (part.type === "file" || part.type === "tool-result") {
						return yield* AiError.make({
							method: "prepareMessages",
							module: "FireworksLanguageModel",
							reason: new AiError.InvalidRequestError({
								description: `Detected unsupported content part for assistant message: '${part.type}'`,
							}),
						});
					}
				}),
			);

			messages.push({
				content: text,
				reasoningContent: reasoning.length > 0 ? Option.some(reasoning) : Option.none(),
				role: "assistant",
				toolCalls: toolCalls.length > 0 ? Option.some(toolCalls) : Option.none(),
			});
		}),
	);

	return messages;
});

const unsupportedSchemaError = (error: unknown, method: string): AiError.AiError =>
	AiError.make({
		method,
		module: "FireworksLanguageModel",
		reason: new AiError.UnsupportedSchemaError({ description: error instanceof Error ? error.message : String(error) }),
	});

const tryJsonSchema = (schema: Schema.Constraint, method: string) =>
	Effect.try({
		catch: (error) => unsupportedSchemaError(error, method),
		try: () => Tool.getJsonSchemaFromSchema(schema, { transformer: OpenAiStructuredOutput.toCodecOpenAI }),
	});

const prepareResponseFormat = Effect.fnUntraced(function* (
	options: LanguageModel.ProviderOptions,
): Effect.fn.Return<Option.Option<FireworksStructuredOutputResponseFormat>, AiError.AiError> {
	if (options.responseFormat.type === "json") {
		const name = options.responseFormat.objectName;
		const schema = options.responseFormat.schema;
		const jsonSchema = yield* tryJsonSchema(schema, "prepareResponseFormat");

		return Option.some({
			jsonSchema: {
				description: SchemaAST.resolveDescription(schema.ast) ?? "Response with a JSON object",
				name,
				schema: jsonSchema,
				strict: true,
			},
			type: "json_schema",
		});
	}

	return Option.none();
});

const tryToolJsonSchema = (tool: Tool.Any, method: string) =>
	Effect.try({
		catch: (error) => unsupportedSchemaError(error, method),
		try: () => Tool.getJsonSchema(tool, { transformer: OpenAiStructuredOutput.toCodecOpenAI }),
	});

const prepareTools = Effect.fnUntraced(function* <Tools extends ReadonlyArray<Tool.Any>>({
	options,
	toolNameMapper,
}: {
	readonly options: LanguageModel.ProviderOptions;
	readonly toolNameMapper: Tool.NameMapper<Tools>;
}): Effect.fn.Return<
	{
		readonly toolChoice: Option.Option<FireworksToolChoice>;
		readonly tools: Option.Option<ReadonlyArray<FireworksTool>>;
	},
	AiError.AiError
> {
	if (options.tools.length === 0) {
		return { toolChoice: Option.none(), tools: Option.none() };
	}

	const tools: Array<FireworksTool> = [];
	let toolChoice: Option.Option<FireworksToolChoice> = Option.none();

	let allowedTools = options.tools;

	if (typeof options.toolChoice === "object" && "oneOf" in options.toolChoice) {
		const allowedToolNames = new Set(options.toolChoice.oneOf);

		allowedTools = options.tools.filter((tool) => allowedToolNames.has(tool.name));
		toolChoice = options.toolChoice.mode === "required" ? Option.some("required") : Option.some("auto");
	}

	for (const tool of allowedTools) {
		if (Tool.isUserDefined(tool) || Tool.isDynamic(tool)) {
			const isStrict = Tool.getStrictMode(tool) ?? true;
			const parameters = yield* tryToolJsonSchema(tool, "prepareTools");

			tools.push({
				function: {
					description: Option.fromUndefinedOr(Tool.getDescription(tool)),
					name: tool.name as string,
					parameters,
					strict: isStrict,
				},
				type: "function",
			});
		}

		if (Tool.isProviderDefined(tool)) {
			return yield* AiError.make({
				method: "prepareTools",
				module: "FireworksLanguageModel",
				reason: new AiError.InvalidRequestError({ description: `Detected unsupported provider tool: "${tool.name}"` }),
			});
		}
	}

	if (options.toolChoice === "auto" || options.toolChoice === "none" || options.toolChoice === "required") {
		toolChoice = Option.some(options.toolChoice);
	}

	if (typeof options.toolChoice === "object" && "tool" in options.toolChoice) {
		const toolName = toolNameMapper.getProviderName(options.toolChoice.tool as string);
		const providerNames = toolNameMapper.providerNames;

		toolChoice =
			providerNames.includes(toolName) ?
				Option.some({ function: { name: toolName }, type: "function" })
			:	Option.some({ function: { name: options.toolChoice.tool as string }, type: "function" });
	}

	return { toolChoice, tools: Option.some(tools) };
});

const getUsage = (usage: Option.Option<FireworksUsage>): Response.Usage => {
	if (Option.isNone(usage)) {
		return {
			inputTokens: { cacheRead: undefined, cacheWrite: undefined, total: undefined, uncached: undefined },
			outputTokens: { reasoning: undefined, text: undefined, total: undefined },
		};
	}

	const inputTokens = usage.value.promptTokens;
	const outputTokens = usage.value.completionTokens;
	const cachedTokens = usage.value.promptTokensDetails.cachedTokens;

	return {
		inputTokens: {
			cacheRead: cachedTokens,
			cacheWrite: undefined,
			total: inputTokens,
			uncached: inputTokens - cachedTokens,
		},
		outputTokens: { reasoning: undefined, text: undefined, total: outputTokens },
	};
};

const buildHttpRequestDetails = (
	request: HttpClientRequest.HttpClientRequest,
): typeof Response.HttpRequestDetails.Type => ({
	hash: Option.getOrUndefined(request.hash),
	headers: Redactable.redact(request.headers) as Record<string, string>,
	method: request.method,
	url: request.url,
	urlParams: [...request.urlParams],
});

const buildHttpResponseDetails = (
	response: HttpClientResponse.HttpClientResponse,
): typeof Response.HttpResponseDetails.Type => ({
	headers: Redactable.redact(response.headers) as Record<string, string>,
	status: response.status,
});

const makeResponse = Effect.fnUntraced(function* <Tools extends ReadonlyArray<Tool.Any>>({
	parsedResponse,
	rawResponse,
	toolNameMapper,
}: {
	readonly parsedResponse: FireworksChatCompletionResponse;
	readonly rawResponse: HttpClientResponse.HttpClientResponse;
	readonly toolNameMapper: Tool.NameMapper<Tools>;
}): Effect.fn.Return<Array<Response.PartEncoded>, AiError.AiError> {
	const parts: Array<Response.PartEncoded> = [];

	const createdAt = new Date(parsedResponse.created * 1_000);

	parts.push({
		id: parsedResponse.id,
		modelId: parsedResponse.model,
		request: buildHttpRequestDetails(rawResponse.request),
		timestamp: DateTime.formatIso(DateTime.fromDateUnsafe(createdAt)),
		type: "response-metadata",
	});

	const choice = parsedResponse.choices[0];
	const message = choice.message;

	if (Option.isSome(message.reasoningContent) && message.reasoningContent.value.length > 0) {
		parts.push({ text: message.reasoningContent.value, type: "reasoning" });
	}

	if (Option.isSome(message.content) && message.content.value.length > 0) {
		parts.push({ text: message.content.value, type: "text" });
	}

	if (Option.isSome(message.toolCalls)) {
		yield* Effect.forEach(
			message.toolCalls.value,
			Effect.fnUntraced(function* (toolCall) {
				const toolId = toolCall.id;
				const toolName = toolNameMapper.getCustomName(toolCall.function.name);
				const toolParams = Option.getOrElse(toolCall.function.arguments, () => "{}");

				const params = yield* Effect.try({
					catch: (cause) =>
						AiError.make({
							method: "makeResponse",
							module: "FireworksLanguageModel",
							reason: new AiError.ToolParameterValidationError({
								description: `Failed to securely JSON parse tool parameters: ${String(cause)}`,
								toolName,
								toolParams: {},
							}),
						}),
					try: () => Tool.unsafeSecureJsonParse(toolParams),
				});

				parts.push({ id: toolId, metadata: { fireworks: {} }, name: toolName, params, type: "tool-call" });
			}),
		);
	}

	parts.push({
		metadata: {
			fireworks: {
				performanceMetrics: {
					serverProcessingTime: Duration.toMillis(parsedResponse.performanceMetrics.serverProcessingTime),
					serverTimeToFirstToken: Duration.toMillis(parsedResponse.performanceMetrics.serverTimeToFirstToken),
				},
			},
		},
		reason: resolveFinishReason(Option.some(choice.finishReason), Option.isSome(message.toolCalls)),
		response: buildHttpResponseDetails(rawResponse),
		type: "finish",
		usage: getUsage(Option.some(parsedResponse.usage)),
	});

	return parts;
});

interface ActiveToolCall {
	arguments: string;
	readonly id: string;
	name: string;
}

const makeStreamResponse = Effect.fnUntraced(function* <Tools extends ReadonlyArray<Tool.Any>>({
	parsedStream,
	rawResponse,
	toolNameMapper,
}: {
	readonly parsedStream: Stream.Stream<FireworksChatCompletionStreamEvent, AiError.AiError>;
	readonly rawResponse: HttpClientResponse.HttpClientResponse;
	readonly toolNameMapper: Tool.NameMapper<Tools>;
}): Effect.fn.Return<Stream.Stream<Response.StreamPartEncoded, AiError.AiError>, AiError.AiError> {
	let usage: FireworksChatCompletionChunk["usage"] = Option.none();
	let finishReason: Option.Option<FireworksFinishReason> = Option.none();
	let performanceMetrics: FireworksChatCompletionChunk["performanceMetrics"] = Option.none();
	let isMetadataEmitted = false;
	let hasTextStarted = false;
	let textId = "";
	let hasReasoningStarted = false;
	let reasoningId = "";
	let hasToolCalls = false;

	const activeToolCalls: Record<number, ActiveToolCall> = {};

	return parsedStream.pipe(
		Stream.mapEffect(
			Effect.fnUntraced(function* (event) {
				const parts: Array<Response.StreamPartEncoded> = [];

				if (event === "[DONE]") {
					if (hasReasoningStarted) {
						parts.push({ id: reasoningId, metadata: { fireworks: {} }, type: "reasoning-end" });
					}

					if (hasTextStarted) {
						parts.push({ id: textId, metadata: { fireworks: {} }, type: "text-end" });
					}

					for (const toolCall of Object.values(activeToolCalls)) {
						const toolParams = toolCall.arguments.length > 0 ? toolCall.arguments : "{}";
						const params = yield* Effect.try({
							catch: (cause) =>
								AiError.make({
									method: "makeStreamResponse",
									module: "FireworksLanguageModel",
									reason: new AiError.ToolParameterValidationError({
										description: `Failed to securely JSON parse tool parameters: ${String(cause)}`,
										toolName: toolCall.name,
										toolParams: {},
									}),
								}),
							try: () => Tool.unsafeSecureJsonParse(toolParams),
						});

						parts.push(
							{ id: toolCall.id, type: "tool-params-end" },
							{ id: toolCall.id, metadata: { fireworks: {} }, name: toolCall.name, params, type: "tool-call" },
						);
						hasToolCalls = true;
					}

					parts.push({
						metadata: {
							fireworks:
								Option.isSome(performanceMetrics) ?
									{
										performanceMetrics: {
											serverProcessingTime: Duration.toMillis(performanceMetrics.value.serverProcessingTime),
											serverTimeToFirstToken: Duration.toMillis(performanceMetrics.value.serverTimeToFirstToken),
										},
									}
								:	null,
						},
						reason: resolveFinishReason(finishReason, hasToolCalls),
						response: buildHttpResponseDetails(rawResponse),
						type: "finish",
						usage: getUsage(usage),
					});

					return parts;
				}

				if (Option.isSome(event.usage)) {
					usage = event.usage;
				}

				if (Option.isSome(event.performanceMetrics)) {
					performanceMetrics = event.performanceMetrics;
				}

				if (!isMetadataEmitted) {
					isMetadataEmitted = true;
					textId = `${event.id}_message`;
					reasoningId = `${event.id}_reasoning`;

					parts.push({
						id: event.id,
						metadata: { fireworks: {} },
						modelId: event.model,
						request: buildHttpRequestDetails(rawResponse.request),
						timestamp: DateTime.formatIso(DateTime.fromDateUnsafe(new Date(event.created * 1_000))),
						type: "response-metadata",
					});
				}

				const choice = event.choices[0];

				if (!choice) {
					return parts;
				}

				if (Option.isSome(choice.finishReason)) {
					finishReason = choice.finishReason;
				}

				if (Option.isSome(choice.delta.reasoningContent) && choice.delta.reasoningContent.value.length > 0) {
					if (!hasReasoningStarted) {
						hasReasoningStarted = true;

						parts.push({ id: reasoningId, metadata: { fireworks: {} }, type: "reasoning-start" });
					}

					parts.push({
						delta: choice.delta.reasoningContent.value,
						id: reasoningId,
						metadata: { fireworks: {} },
						type: "reasoning-delta",
					});
				}

				if (Option.isSome(choice.delta.content)) {
					if (hasReasoningStarted) {
						hasReasoningStarted = false;

						parts.push({ id: reasoningId, metadata: { fireworks: {} }, type: "reasoning-end" });
					}

					if (!hasTextStarted) {
						hasTextStarted = true;

						parts.push({ id: textId, metadata: { fireworks: {} }, type: "text-start" });
					}

					parts.push({
						delta: choice.delta.content.value,
						id: textId,
						metadata: { fireworks: {} },
						type: "text-delta",
					});
				}

				if (Option.isSome(choice.delta.toolCalls)) {
					const toolCalls = choice.delta.toolCalls.value;

					hasToolCalls ||= toolCalls.length > 0;

					toolCalls.forEach((deltaTool) => {
						const activeToolCall = activeToolCalls[deltaTool.index];
						const toolId = activeToolCall?.id ?? deltaTool.id;

						const toolName =
							Option.isSome(deltaTool.function.name) ?
								toolNameMapper.getCustomName(deltaTool.function.name.value)
							:	(activeToolCall?.name ?? toolNameMapper.getCustomName("unknown_tool"));

						const argumentsDelta = Option.getOrElse(deltaTool.function.arguments, () => "");

						if (activeToolCall) {
							activeToolCall.name = toolName;
							activeToolCall.arguments = `${activeToolCall.arguments}${argumentsDelta}`;
						} else {
							activeToolCalls[deltaTool.index] = { arguments: argumentsDelta, id: toolId, name: toolName };
							parts.push({ id: toolId, metadata: { fireworks: {} }, name: toolName, type: "tool-params-start" });
						}

						if (argumentsDelta.length > 0) {
							parts.push({ delta: argumentsDelta, id: toolId, metadata: { fireworks: {} }, type: "tool-params-delta" });
						}
					});
				}

				return parts;
			}),
		),
		Stream.flattenIterable,
	);
});

const make = Effect.fnUntraced(function* (options: {
	readonly config?:
		| Partial<Omit<typeof DeepseekConfig.Service, "model">>
		| Partial<Omit<typeof GlmConfig.Service, "model">>
		| Partial<Omit<typeof KimiConfig.Service, "model">>
		| Partial<Omit<typeof MinimaxConfig.Service, "model">>
		| Partial<Omit<typeof QwenConfig.Service, "model">>
		| undefined;
	readonly configContext:
		typeof DeepseekConfig | typeof GlmConfig | typeof KimiConfig | typeof MinimaxConfig | typeof QwenConfig;
	readonly model: DeepseekModel | GlmModel | KimiModel | MinimaxModel | QwenModel;
}): Effect.fn.Return<LanguageModel.Service, never, FireworksClient> {
	const client = yield* FireworksClient;

	const configWithDefaults = {
		contextLengthExceededBehavior: Option.fromUndefinedOr(options.config?.contextLengthExceededBehavior).pipe(
			Option.flatten,
		),
		maxTokens: Option.fromUndefinedOr(options.config?.maxTokens).pipe(Option.flatten),
		parallelToolCalls: Option.fromUndefinedOr(options.config?.parallelToolCalls).pipe(Option.flatten),
		promptCacheIsolationKey: Option.fromUndefinedOr(options.config?.promptCacheIsolationKey).pipe(Option.flatten),
		promptCacheKey: Option.fromUndefinedOr(options.config?.promptCacheKey).pipe(Option.flatten),
		reasoningEffort: Option.fromUndefinedOr(options.config?.reasoningEffort).pipe(Option.flatten),
		reasoningHistory: Option.fromUndefinedOr(options.config?.reasoningHistory).pipe(Option.flatten),
		serviceTier: Option.fromUndefinedOr(options.config?.serviceTier).pipe(Option.flatten),
		temperature: Option.fromUndefinedOr(options.config?.temperature).pipe(Option.flatten),
	};

	const makeConfig = Effect.gen(function* () {
		if (options.configContext.key === "@naamio/ai-fireworks/DeepseekConfig") {
			const providedConfig = yield* Effect.serviceOption(options.configContext);

			return { model: options.model, ...configWithDefaults, ...Option.getOrUndefined(providedConfig) };
		}

		if (options.configContext.key === "@naamio/ai-fireworks/GlmConfig") {
			const providedConfig = yield* Effect.serviceOption(options.configContext);

			return { model: options.model, ...configWithDefaults, ...Option.getOrUndefined(providedConfig) };
		}

		if (options.configContext.key === "@naamio/ai-fireworks/KimiConfig") {
			const providedConfig = yield* Effect.serviceOption(options.configContext);

			return { model: options.model, ...configWithDefaults, ...Option.getOrUndefined(providedConfig) };
		}

		if (options.configContext.key === "@naamio/ai-fireworks/MinimaxConfig") {
			const providedConfig = yield* Effect.serviceOption(options.configContext);

			return { model: options.model, ...configWithDefaults, ...Option.getOrUndefined(providedConfig) };
		}

		const providedConfig = yield* Effect.serviceOption(options.configContext);

		return { model: options.model, ...configWithDefaults, ...Option.getOrUndefined(providedConfig) };
	});

	const makeRequest = Effect.fnUntraced(function* <Tools extends ReadonlyArray<Tool.Any>>({
		config,
		options,
		toolNameMapper,
	}: {
		readonly config: AnyFireworksLanguageModelConfig;
		readonly options: LanguageModel.ProviderOptions;
		readonly toolNameMapper: Tool.NameMapper<Tools>;
	}): Effect.fn.Return<FireworksCreateResponseOptions, AiError.AiError> {
		const messages = yield* prepareMessages({ options, toolNameMapper });

		const { toolChoice, tools } = yield* prepareTools({ options, toolNameMapper });

		const responseFormat = yield* prepareResponseFormat(options);

		return { ...config, messages, responseFormat, toolChoice, tools };
	});

	return yield* LanguageModel.make({
		codecTransformer: OpenAiStructuredOutput.toCodecOpenAI,
		generateText: Effect.fnUntraced(function* (options) {
			const config = yield* makeConfig;
			const toolNameMapper = new Tool.NameMapper(options.tools);
			const request = yield* makeRequest({ config, options, toolNameMapper });

			annotateRequest(options.span, request);

			const [parsedResponse, rawResponse] = yield* client.createResponse(request);

			annotateResponse(options.span, parsedResponse);

			return yield* makeResponse({ parsedResponse, rawResponse, toolNameMapper });
		}),
		streamText: Effect.fnUntraced(
			function* (options) {
				const config = yield* makeConfig;
				const toolNameMapper = new Tool.NameMapper(options.tools);
				const request = yield* makeRequest({ config, options, toolNameMapper });

				annotateRequest(options.span, request);

				const [parsedStream, rawResponse] = yield* client.createResponseStream(request);

				return yield* makeStreamResponse({ parsedStream, rawResponse, toolNameMapper });
			},
			(effect, options) =>
				effect.pipe(
					Stream.unwrap,
					Stream.map((response) => {
						annotateStreamResponse(options.span, response);
						return response;
					}),
				),
		),
	});
});

const makeKimi = (options: {
	readonly config?: Partial<Omit<typeof KimiConfig.Service, "model">> | undefined;
	readonly model: KimiModel;
}) => make({ config: options.config, configContext: KimiConfig, model: options.model });

export const layerKimi = (options: {
	readonly config?: Partial<Omit<typeof KimiConfig.Service, "model">> | undefined;
	readonly model: KimiModel;
}) => Layer.effect(LanguageModel.LanguageModel, makeKimi(options));

export const modelKimi = (model: KimiModel, config?: Partial<Omit<typeof KimiConfig.Service, "model">>) =>
	Model.make("fireworks", model, layerKimi({ config, model }));

const makeDeepseek = (options: {
	readonly config?: Partial<Omit<typeof DeepseekConfig.Service, "model">> | undefined;
	readonly model: DeepseekModel;
}) => make({ config: options.config, configContext: DeepseekConfig, model: options.model });

export const layerDeepseek = (options: {
	readonly config?: Partial<Omit<typeof DeepseekConfig.Service, "model">> | undefined;
	readonly model: DeepseekModel;
}) => Layer.effect(LanguageModel.LanguageModel, makeDeepseek(options));

export const modelDeepseek = (model: DeepseekModel, config?: Partial<Omit<typeof DeepseekConfig.Service, "model">>) =>
	Model.make("fireworks", model, layerDeepseek({ config, model }));

const makeQwen = (options: {
	readonly config?: Partial<Omit<typeof QwenConfig.Service, "model">> | undefined;
	readonly model: QwenModel;
}) => make({ config: options.config, configContext: QwenConfig, model: options.model });

export const layerQwen = (options: {
	readonly config?: Partial<Omit<typeof QwenConfig.Service, "model">> | undefined;
	readonly model: QwenModel;
}) => Layer.effect(LanguageModel.LanguageModel, makeQwen(options));

export const modelQwen = (model: QwenModel, config?: Partial<Omit<typeof QwenConfig.Service, "model">>) =>
	Model.make("fireworks", model, layerQwen({ config, model }));

const makeGlm = (options: {
	readonly config?: Partial<Omit<typeof GlmConfig.Service, "model">> | undefined;
	readonly model: GlmModel;
}) => make({ config: options.config, configContext: GlmConfig, model: options.model });

export const layerGlm = (options: {
	readonly config?: Partial<Omit<typeof GlmConfig.Service, "model">> | undefined;
	readonly model: GlmModel;
}) => Layer.effect(LanguageModel.LanguageModel, makeGlm(options));

export const modelGlm = (model: GlmModel, config?: Partial<Omit<typeof GlmConfig.Service, "model">>) =>
	Model.make("fireworks", model, layerGlm({ config, model }));

const makeMinimax = (options: {
	readonly config?: Partial<Omit<typeof MinimaxConfig.Service, "model">> | undefined;
	readonly model: MinimaxModel;
}) => make({ config: options.config, configContext: MinimaxConfig, model: options.model });

export const layerMinimax = (options: {
	readonly config?: Partial<Omit<typeof MinimaxConfig.Service, "model">> | undefined;
	readonly model: MinimaxModel;
}) => Layer.effect(LanguageModel.LanguageModel, makeMinimax(options));

export const modelMinimax = (model: MinimaxModel, config?: Partial<Omit<typeof MinimaxConfig.Service, "model">>) =>
	Model.make("fireworks", model, layerMinimax({ config, model }));
