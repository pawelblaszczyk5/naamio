import { Duration, Schema, SchemaGetter, SchemaTransformation } from "effect";

import { Model } from "#src/internal/shared.js";

const FireworksToolCall = Schema.Struct({
	function: Schema.Struct({ arguments: Schema.String.pipe(Schema.OptionFromOptionalKey), name: Schema.String }),
	id: Schema.String,
	index: Schema.Number,
	type: Schema.Literal("function"),
});

const FireworksToolCallDelta = Schema.Struct({
	function: Schema.Struct({
		arguments: Schema.String.pipe(Schema.OptionFromOptionalKey),
		name: Schema.String.pipe(Schema.OptionFromOptionalNullOr),
	}),
	id: Schema.String,
	index: Schema.Number,
	type: Schema.Literal("function"),
});

const FireworksMessage = Schema.Struct({
	content: Schema.String.pipe(Schema.OptionFromOptionalKey),
	reasoningContent: Schema.String.pipe(Schema.OptionFromOptionalKey),
	toolCalls: Schema.Array(FireworksToolCall).pipe(Schema.OptionFromOptionalKey),
}).pipe(Schema.encodeKeys({ reasoningContent: "reasoning_content", toolCalls: "tool_calls" }));

const FireworksDelta = Schema.Struct({
	content: Schema.String.pipe(Schema.OptionFromOptionalKey),
	reasoningContent: Schema.String.pipe(Schema.OptionFromOptionalKey),
	toolCalls: Schema.Array(FireworksToolCallDelta).pipe(Schema.OptionFromOptionalKey),
}).pipe(Schema.encodeKeys({ reasoningContent: "reasoning_content", toolCalls: "tool_calls" }));

const FireworksFinishReason = Schema.Literals(["tool_calls", "stop", "length"]);

export type FireworksFinishReason = Schema.Schema.Type<typeof FireworksFinishReason>;

const FireworksCompletedChoice = Schema.Struct({
	finishReason: FireworksFinishReason,
	index: Schema.Number,
	message: FireworksMessage,
}).pipe(Schema.encodeKeys({ finishReason: "finish_reason" }));

const FireworksDeltaChoice = Schema.Struct({
	delta: FireworksDelta,
	finishReason: FireworksFinishReason.pipe(Schema.OptionFromNullOr),
	index: Schema.Number,
}).pipe(Schema.encodeKeys({ finishReason: "finish_reason" }));

const DurationFromSeconds = Schema.Number.check(Schema.isGreaterThan(0)).pipe(
	Schema.decodeTo(Schema.Duration, {
		decode: SchemaGetter.transform((value) => Duration.seconds(value)),
		encode: SchemaGetter.transform((duration) => Duration.toSeconds(duration)),
	}),
);

const DurationFromStringSeconds = DurationFromSeconds.pipe(
	Schema.encodeTo(Schema.String, SchemaTransformation.numberFromString),
);

const FireworksPerformanceMetrics = Schema.Struct({
	serverProcessingTime: DurationFromStringSeconds,
	serverTimeToFirstToken: DurationFromStringSeconds,
}).pipe(
	Schema.encodeKeys({
		serverProcessingTime: "server-processing-time",
		serverTimeToFirstToken: "server-time-to-first-token",
	}),
);

const FireworksUsage = Schema.Struct({
	completionTokens: Schema.Int,
	promptTokens: Schema.Int,
	promptTokensDetails: Schema.Struct({ cachedTokens: Schema.Int }).pipe(
		Schema.encodeKeys({ cachedTokens: "cached_tokens" }),
	),
	totalTokens: Schema.Int,
}).pipe(
	Schema.encodeKeys({
		completionTokens: "completion_tokens",
		promptTokens: "prompt_tokens",
		promptTokensDetails: "prompt_tokens_details",
		totalTokens: "total_tokens",
	}),
);

export type FireworksUsage = Schema.Schema.Type<typeof FireworksUsage>;

export const FireworksChatCompletionResponse = Schema.Struct({
	choices: Schema.NonEmptyArray(FireworksCompletedChoice),
	created: Schema.Number,
	id: Schema.String,
	model: Model,
	performanceMetrics: FireworksPerformanceMetrics,
	usage: FireworksUsage,
}).pipe(Schema.encodeKeys({ performanceMetrics: "perf_metrics" }));
export type FireworksChatCompletionResponse = Schema.Schema.Type<typeof FireworksChatCompletionResponse>;

export const FireworksChatCompletionChunk = Schema.Struct({
	choices: Schema.Array(FireworksDeltaChoice),
	created: Schema.Number,
	id: Schema.String,
	model: Model,
	performanceMetrics: FireworksPerformanceMetrics.pipe(Schema.OptionFromOptionalKey),
	usage: FireworksUsage.pipe(Schema.OptionFromNullOr),
}).pipe(Schema.encodeKeys({ performanceMetrics: "perf_metrics" }));
export type FireworksChatCompletionChunk = Schema.Schema.Type<typeof FireworksChatCompletionChunk>;
