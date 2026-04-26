import type { Option } from "effect";

export interface FireworksErrorMetadata {
	errorCode: Option.Option<string>;
	errorType: Option.Option<string>;
	requestId: Option.Option<string>;
}

export interface FireworksRateLimitMetadata extends FireworksErrorMetadata {}

declare module "effect/unstable/ai/AiError" {
	export interface RateLimitErrorMetadata {
		readonly fireworks?: FireworksRateLimitMetadata | null;
	}

	export interface QuotaExhaustedErrorMetadata {
		readonly fireworks?: FireworksErrorMetadata | null;
	}

	export interface AuthenticationErrorMetadata {
		readonly fireworks?: FireworksErrorMetadata | null;
	}

	export interface ContentPolicyErrorMetadata {
		readonly fireworks?: FireworksErrorMetadata | null;
	}

	export interface InvalidRequestErrorMetadata {
		readonly fireworks?: FireworksErrorMetadata | null;
	}

	export interface InternalProviderErrorMetadata {
		readonly fireworks?: FireworksErrorMetadata | null;
	}

	export interface InvalidOutputErrorMetadata {
		readonly fireworks?: FireworksErrorMetadata | null;
	}

	export interface StructuredOutputErrorMetadata {
		readonly fireworks?: FireworksErrorMetadata | null;
	}

	export interface UnsupportedSchemaErrorMetadata {
		readonly fireworks?: FireworksErrorMetadata | null;
	}

	export interface UnknownErrorMetadata {
		readonly fireworks?: FireworksErrorMetadata | null;
	}
}
