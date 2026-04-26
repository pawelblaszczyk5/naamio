import { Match, Schema, SchemaGetter } from "effect";

const EncodedModel = Schema.Literals([
	"accounts/fireworks/models/minimax-m3",
	"accounts/fireworks/models/kimi-k2p6",
	"accounts/fireworks/models/kimi-k2p7-code",
	"accounts/fireworks/models/deepseek-v4-pro",
	"accounts/fireworks/models/deepseek-v4-flash",
	"accounts/fireworks/models/glm-5p2",
	"accounts/fireworks/models/qwen3p7-plus",
]);

const DecodedModel = Schema.Literals([
	"minimax-m3",
	"kimi-k2p6",
	"kimi-k2p7-code",
	"deepseek-v4-pro",
	"deepseek-v4-flash",
	"glm-5p2",
	"qwen3p7-plus",
]);

export const Model = EncodedModel.pipe(
	Schema.decodeTo(DecodedModel, {
		decode: SchemaGetter.transform(
			Match.type<Schema.Schema.Type<typeof EncodedModel>>().pipe(
				Match.withReturnType<Schema.Schema.Type<typeof DecodedModel>>(),
				Match.when("accounts/fireworks/models/minimax-m3", () => "minimax-m3"),
				Match.when("accounts/fireworks/models/kimi-k2p6", () => "kimi-k2p6"),
				Match.when("accounts/fireworks/models/kimi-k2p7-code", () => "kimi-k2p7-code"),
				Match.when("accounts/fireworks/models/deepseek-v4-pro", () => "deepseek-v4-pro"),
				Match.when("accounts/fireworks/models/deepseek-v4-flash", () => "deepseek-v4-flash"),
				Match.when("accounts/fireworks/models/glm-5p2", () => "glm-5p2"),
				Match.when("accounts/fireworks/models/qwen3p7-plus", () => "qwen3p7-plus"),
				Match.exhaustive,
			),
		),
		encode: SchemaGetter.transform(
			Match.type<Schema.Schema.Type<typeof DecodedModel>>().pipe(
				Match.withReturnType<Schema.Schema.Type<typeof EncodedModel>>(),
				Match.when("minimax-m3", () => "accounts/fireworks/models/minimax-m3"),
				Match.when("kimi-k2p6", () => "accounts/fireworks/models/kimi-k2p6"),
				Match.when("kimi-k2p7-code", () => "accounts/fireworks/models/kimi-k2p7-code"),
				Match.when("deepseek-v4-pro", () => "accounts/fireworks/models/deepseek-v4-pro"),
				Match.when("deepseek-v4-flash", () => "accounts/fireworks/models/deepseek-v4-flash"),
				Match.when("glm-5p2", () => "accounts/fireworks/models/glm-5p2"),
				Match.when("qwen3p7-plus", () => "accounts/fireworks/models/qwen3p7-plus"),
				Match.exhaustive,
			),
		),
	}),
);
