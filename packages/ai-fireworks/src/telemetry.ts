import type { Tracer, Types } from "effect";

import { Function, String } from "effect";
import { Telemetry } from "effect/unstable/ai";

export type WellKnownResponseFormat = "json_schema" | "text";
export type WellKnownServiceTier = "default" | "priority";

interface RequestAttributes {
	readonly responseFormat?: null | (string & {}) | undefined | WellKnownResponseFormat;
	readonly serviceTier?: null | (string & {}) | undefined | WellKnownServiceTier;
}

interface ResponseAttributes {
	readonly serverProcessingTime?: number | undefined;
	readonly serverTimeToFirstToken?: number | undefined;
}

export type FireworksTelemetryAttributes = Types.Simplify<
	Telemetry.AttributesWithPrefix<RequestAttributes, "gen_ai.fireworks.request">
		& Telemetry.AttributesWithPrefix<ResponseAttributes, "gen_ai.fireworks.request">
		& Telemetry.GenAITelemetryAttributes
>;

export type FireworksTelemetryAttributeOptions = Telemetry.GenAITelemetryAttributeOptions & {
	fireworks?: undefined | { request?: RequestAttributes | undefined; response?: ResponseAttributes | undefined };
};

const addFireworksRequestAttributes = Telemetry.addSpanAttributes(
	"gen_ai.fireworks.request",
	String.camelToSnake,
)<RequestAttributes>;

const addFireworkResponseAttributes = Telemetry.addSpanAttributes(
	"gen_ai.fireworks.response",
	String.camelToSnake,
)<ResponseAttributes>;

export const addGenAIAnnotations = Function.dual<
	(options: FireworksTelemetryAttributeOptions) => (span: Tracer.Span) => void,
	(span: Tracer.Span, options: FireworksTelemetryAttributeOptions) => void
>(2, (span, options) => {
	Telemetry.addGenAIAnnotations(span, options);
	if (options.fireworks) {
		if (options.fireworks.request) {
			addFireworksRequestAttributes(span, options.fireworks.request);
		}
		if (options.fireworks.response) {
			addFireworkResponseAttributes(span, options.fireworks.response);
		}
	}
});
