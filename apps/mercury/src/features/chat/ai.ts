import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { NodeHttpClient } from "@effect/platform-node";
import { Config, Layer } from "effect";

const OpenAiClientLayer = OpenAiClient.layerConfig({ apiKey: Config.redacted("OPEN_AI_API_KEY") }).pipe(
	Layer.provide(NodeHttpClient.layerNodeHttp),
);

export const LanguageModelLayer = OpenAiLanguageModel.layer({ model: "gpt-5.2-2025-12-11" }).pipe(
	Layer.provide(OpenAiClientLayer),
);
