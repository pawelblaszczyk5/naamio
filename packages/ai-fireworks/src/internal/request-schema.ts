import { Schema } from "effect";

import { Model } from "#src/internal/shared.js";

const FireworksToolCall = Schema.Struct({
	function: Schema.Struct({ arguments: Schema.String, name: Schema.String }),
	id: Schema.String,
	type: Schema.Literal("function"),
});

export type FireworksToolCall = Schema.Schema.Type<typeof FireworksToolCall>;

const FireworksTextContent = Schema.Struct({ text: Schema.String, type: Schema.Literal("text") });

const FireworksImageUrlContent = Schema.Struct({
	imageUrl: Schema.Struct({ url: Schema.String }),
	type: Schema.Literal("image_url"),
}).pipe(Schema.encodeKeys({ imageUrl: "image_url" }));

const FireworksUserContent = Schema.Union([FireworksTextContent, FireworksImageUrlContent]);

export type FireworksUserContent = Schema.Schema.Type<typeof FireworksUserContent>;

const FireworksUserMessage = Schema.Struct({
	content: Schema.Array(FireworksUserContent),
	role: Schema.Literal("user"),
});

const FireworksSystemMessage = Schema.Struct({ content: Schema.String, role: Schema.Literal("system") });

const FireworksAssistantMessage = Schema.Struct({
	content: Schema.String,
	reasoningContent: Schema.String.pipe(Schema.OptionFromOptionalKey),
	role: Schema.Literal("assistant"),
	toolCalls: Schema.Array(FireworksToolCall).pipe(Schema.OptionFromOptionalKey),
}).pipe(Schema.encodeKeys({ reasoningContent: "reasoning_content", toolCalls: "tool_calls" }));

const FireworksToolMessage = Schema.Struct({
	content: Schema.String,
	role: Schema.Literal("tool"),
	toolCallId: Schema.String,
}).pipe(Schema.encodeKeys({ toolCallId: "tool_call_id" }));

const FireworksMessage = Schema.Union([
	FireworksSystemMessage,
	FireworksUserMessage,
	FireworksAssistantMessage,
	FireworksToolMessage,
]);

export type FireworksMessage = Schema.Schema.Type<typeof FireworksMessage>;

const FireworksFunctionTool = Schema.Struct({
	function: Schema.Struct({
		description: Schema.String.pipe(Schema.OptionFromOptionalKey),
		name: Schema.String,
		parameters: Schema.Unknown,
		strict: Schema.Boolean,
	}),
	type: Schema.Literal("function"),
});

const FireworksTool = Schema.Union([FireworksFunctionTool]);

export type FireworksTool = Schema.Schema.Type<typeof FireworksTool>;

const FireworksToolChoice = Schema.Union([
	Schema.Literals(["none", "auto", "required"]),
	Schema.Struct({ function: Schema.Struct({ name: Schema.String }), type: Schema.Literal("function") }),
]);

export type FireworksToolChoice = Schema.Schema.Type<typeof FireworksToolChoice>;

const FireworksStructuredOutputResponseFormat = Schema.Struct({
	jsonSchema: Schema.Struct({
		description: Schema.String,
		name: Schema.String,
		schema: Schema.Unknown,
		strict: Schema.Boolean,
	}),
	type: Schema.Literal("json_schema"),
}).pipe(Schema.encodeKeys({ jsonSchema: "json_schema" }));

export type FireworksStructuredOutputResponseFormat = Schema.Schema.Type<
	typeof FireworksStructuredOutputResponseFormat
>;

export const MiniMaxReasoningEffort = Schema.Literals(["none", "low", "medium", "high", "adaptive"]);
export type MiniMaxReasoningEffort = Schema.Schema.Type<typeof MiniMaxReasoningEffort>;
export const QwenReasoningEffort = Schema.Literals(["none", "low", "medium", "high"]);
export type QwenReasoningEffort = Schema.Schema.Type<typeof QwenReasoningEffort>;
export const DeepseekReasoningEffort = Schema.Literals(["none", "high", "max"]);
export type DeepseekReasoningEffort = Schema.Schema.Type<typeof DeepseekReasoningEffort>;
export const KimiReasoningEffort = Schema.Literals(["none", "low", "medium", "high"]);
export type KimiReasoningEffort = Schema.Schema.Type<typeof KimiReasoningEffort>;
export const GlmReasoningEffort = Schema.Literals(["none", "high", "max"]);
export type GlmReasoningEffort = Schema.Schema.Type<typeof GlmReasoningEffort>;

export const FireworksChatCompletionRequest = Schema.Struct({
	contextLengthExceededBehavior: Schema.Literals(["error", "truncate"]).pipe(Schema.OptionFromOptionalKey),
	maxTokens: Schema.Int.check(Schema.isGreaterThan(0)).pipe(Schema.OptionFromOptionalKey),
	messages: Schema.Array(FireworksMessage),
	model: Model,
	parallelToolCalls: Schema.Boolean.pipe(Schema.OptionFromOptionalKey),
	perfMetricsInResponse: Schema.Boolean.pipe(Schema.OptionFromOptionalKey),
	promptCacheIsolationKey: Schema.String.pipe(Schema.OptionFromOptionalKey),
	promptCacheKey: Schema.String.pipe(Schema.OptionFromOptionalKey),
	reasoningEffort: Schema.Union([
		MiniMaxReasoningEffort,
		QwenReasoningEffort,
		DeepseekReasoningEffort,
		KimiReasoningEffort,
		GlmReasoningEffort,
	]).pipe(Schema.OptionFromOptionalKey),
	reasoningHistory: Schema.Literals(["interleaved", "disabled", "preserved"]).pipe(Schema.OptionFromOptionalKey),
	responseFormat: FireworksStructuredOutputResponseFormat.pipe(Schema.OptionFromOptionalKey),
	serviceTier: Schema.Literals(["default", "priority"]).pipe(Schema.OptionFromOptionalKey),
	stream: Schema.Boolean.pipe(Schema.OptionFromOptionalKey),
	streamOptions: Schema.Struct({ includeUsage: Schema.Boolean }).pipe(
		Schema.encodeKeys({ includeUsage: "include_usage" }),
		Schema.OptionFromOptionalKey,
	),
	temperature: Schema.Number.check(Schema.isBetween({ maximum: 2, minimum: 0 })).pipe(Schema.OptionFromOptionalKey),
	toolChoice: FireworksToolChoice.pipe(Schema.OptionFromOptionalKey),
	tools: Schema.Array(FireworksTool).pipe(Schema.OptionFromOptionalKey),
}).pipe(
	Schema.encodeKeys({
		contextLengthExceededBehavior: "context_length_exceeded_behavior",
		maxTokens: "max_tokens",
		parallelToolCalls: "parallel_tool_calls",
		perfMetricsInResponse: "perf_metrics_in_response",
		promptCacheIsolationKey: "prompt_cache_isolation_key",
		promptCacheKey: "prompt_cache_key",
		reasoningEffort: "reasoning_effort",
		reasoningHistory: "reasoning_history",
		responseFormat: "response_format",
		serviceTier: "service_tier",
		streamOptions: "stream_options",
		toolChoice: "tool_choice",
	}),
);
export type FireworksChatCompletionRequest = Schema.Schema.Type<typeof FireworksChatCompletionRequest>;
