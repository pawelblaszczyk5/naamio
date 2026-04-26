import type { Response } from "effect/unstable/ai";
import type { HttpClientError, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";

import { Effect, Function, Match, Option, Redactable, Schema } from "effect";
import { AiError } from "effect/unstable/ai";

import type { FireworksErrorMetadata } from "#src/error.js";

const FireworksErrorBody = Schema.Struct({
	error: Schema.Struct({
		code: Schema.String.pipe(Schema.OptionFromOptionalNullOr),
		message: Schema.String.pipe(Schema.OptionFromOptionalNullOr),
		param: Schema.String.pipe(Schema.OptionFromOptionalNullOr),
		type: Schema.String.pipe(Schema.OptionFromOptionalNullOr),
	}),
});

const decodeFireworksErrorBodyJson = Schema.decodeUnknownOption(Schema.fromJsonString(FireworksErrorBody));

export const mapSchemaError = Function.dual<
	(method: string) => (error: Schema.SchemaError) => AiError.AiError,
	(error: Schema.SchemaError, method: string) => AiError.AiError
>(2, (error, method) =>
	AiError.make({ method, module: "FireworksClient", reason: AiError.InvalidOutputError.fromSchemaError(error) }),
);

const buildHttpRequestDetails = (
	request: HttpClientRequest.HttpClientRequest,
): typeof Response.HttpRequestDetails.Type => ({
	hash: Option.getOrUndefined(request.hash),
	headers: Redactable.redact(request.headers) as Record<string, string>,
	method: request.method,
	url: request.url,
	urlParams: [...request.urlParams],
});

export const buildHttpContext = (params: {
	readonly body?: string | undefined;
	readonly request: HttpClientRequest.HttpClientRequest;
	readonly response?: HttpClientResponse.HttpClientResponse;
}): typeof AiError.HttpContext.Type => ({
	body: params.body,
	request: buildHttpRequestDetails(params.request),
	response:
		params.response === undefined ?
			undefined
		:	{ headers: Redactable.redact(params.response.headers) as Record<string, string>, status: params.response.status },
});

const buildInvalidRequestDescription = (params: {
	readonly body: string | undefined;
	readonly errorCode: Option.Option<string>;
	readonly errorType: Option.Option<string>;
	readonly message: Option.Option<string>;
	readonly method: string;
	readonly requestId: Option.Option<string>;
	readonly status: number;
	readonly url: string;
}): string => {
	const parts: Array<string> = [];

	if (Option.isSome(params.message)) {
		parts.push(params.message.value);
	} else {
		parts.push(`HTTP ${params.status.toString()}`);
	}

	parts.push(`(${params.method} ${params.url})`);

	if (Option.isSome(params.errorCode)) {
		parts.push(`[code: ${params.errorCode.value}]`);
	} else if (Option.isSome(params.errorType)) {
		parts.push(`[type: ${params.errorType.value}]`);
	}

	if (Option.isSome(params.requestId)) {
		parts.push(`[requestId: ${params.requestId.value}]`);
	}

	if (Option.isNone(params.message) && params.body) {
		const truncated = params.body.length > 200 ? `${params.body.slice(0, 200)}...` : params.body;

		parts.push(`Response: ${truncated}`);
	}

	return parts.join(" ");
};

const mapStatusCodeToReason = (params: {
	// eslint-disable-next-line unicorn/no-unused-properties -- that's here for rate limiting, but I didn't handle it yet correctly
	readonly headers: Record<string, string>;
	readonly http: typeof AiError.HttpContext.Type;
	readonly message: Option.Option<string>;
	readonly metadata: FireworksErrorMetadata;
	readonly status: number;
}): AiError.AiErrorReason => {
	const invalidRequestDescription = buildInvalidRequestDescription({
		body: params.http.body,
		errorCode: params.metadata.errorCode,
		errorType: params.metadata.errorType,
		message: params.message,
		method: params.http.request.method,
		requestId: params.metadata.requestId,
		status: params.status,
		url: params.http.request.url,
	});

	return Match.value(params.status).pipe(
		Match.when(
			400,
			() =>
				new AiError.InvalidRequestError({
					description: invalidRequestDescription,
					http: params.http,
					metadata: { fireworks: params.metadata },
				}),
		),
		Match.when(
			401,
			() =>
				new AiError.AuthenticationError({
					http: params.http,
					kind: "InvalidKey",
					metadata: { fireworks: params.metadata },
				}),
		),
		Match.when(
			403,
			() =>
				new AiError.AuthenticationError({
					http: params.http,
					kind: "InsufficientPermissions",
					metadata: { fireworks: params.metadata },
				}),
		),
		Match.when(
			404,
			() =>
				new AiError.InvalidRequestError({
					description: invalidRequestDescription,
					http: params.http,
					metadata: { fireworks: params.metadata },
				}),
		),
		Match.whenOr(
			409,
			422,
			() =>
				new AiError.InvalidRequestError({
					description: invalidRequestDescription,
					http: params.http,
					metadata: { fireworks: params.metadata },
				}),
		),
		Match.when(
			429,
			() =>
				new AiError.RateLimitError({
					http: params.http,
					metadata: { fireworks: params.metadata },
					retryAfter: undefined,
				}),
		),
		Match.orElse((status) => {
			if (status >= 500) {
				return new AiError.InternalProviderError({
					description: Option.getOrElse(params.message, () => "Server error"),
					http: params.http,
					metadata: { fireworks: params.metadata },
				});
			}
			return new AiError.UnknownError({
				description: Option.getOrUndefined(params.message),
				http: params.http,
				metadata: { fireworks: params.metadata },
			});
		}),
	);
};

const mapStatusCodeError = Effect.fnUntraced(function* (error: HttpClientError.StatusCodeError, method: string) {
	const status = error.response.status;
	const headers = error.response.headers as Record<string, string>;
	const requestId = Option.fromUndefinedOr(headers["x-request-id"]);

	const body = yield* error.response.text.pipe(
		Effect.catchCause(() => Effect.succeed(error.description?.startsWith("{") ? error.description : undefined)),
	);

	const decoded = decodeFireworksErrorBodyJson(body);

	const reason = mapStatusCodeToReason({
		headers,
		http: buildHttpContext({ body, request: error.request, response: error.response }),
		message: decoded.pipe(Option.flatMap((value) => value.error.message)),
		metadata: {
			errorCode: decoded.pipe(Option.flatMap((value) => value.error.code)),

			errorType: decoded.pipe(Option.flatMap((value) => value.error.type)),
			requestId,
		},
		status,
	});

	return yield* AiError.make({ method, module: "FireworksClient", reason });
});

export const mapHttpClientError = Function.dual<
	(
		method: "createResponse" | "createResponseStream",
	) => (error: HttpClientError.HttpClientError) => Effect.Effect<never, AiError.AiError>,
	(
		error: HttpClientError.HttpClientError,
		method: "createResponse" | "createResponseStream",
	) => Effect.Effect<never, AiError.AiError>
>(2, (error, method) => {
	const reason = error.reason;

	return Match.valueTags(reason, {
		DecodeError: (reason) =>
			Effect.fail(
				AiError.make({
					method,
					module: "FireworksClient",
					reason: new AiError.InvalidOutputError({ description: reason.description ?? "Failed to decode response" }),
				}),
			),
		EmptyBodyError: () =>
			Effect.fail(
				AiError.make({
					method,
					module: "FireworksClient",
					reason: new AiError.InvalidOutputError({ description: reason.description ?? "Response body was empty" }),
				}),
			),
		EncodeError: () =>
			Effect.fail(
				AiError.make({
					method,
					module: "FireworksClient",
					reason: new AiError.NetworkError({
						description: reason.description,
						reason: "EncodeError",
						request: buildHttpRequestDetails(reason.request),
					}),
				}),
			),
		InvalidUrlError: () =>
			Effect.fail(
				AiError.make({
					method,
					module: "FireworksClient",
					reason: new AiError.NetworkError({
						description: reason.description,
						reason: "InvalidUrlError",
						request: buildHttpRequestDetails(reason.request),
					}),
				}),
			),
		StatusCodeError: (reason) => mapStatusCodeError(reason, method),
		TransportError: () =>
			Effect.fail(
				AiError.make({
					method,
					module: "FireworksClient",
					reason: new AiError.NetworkError({
						description: reason.description,
						reason: "TransportError",
						request: buildHttpRequestDetails(reason.request),
					}),
				}),
			),
	});
});

export * as Errors from "#src/internal/errors.js";
