import { createFileRoute } from "@tanstack/react-router";
import { getRequestUrl } from "@tanstack/react-start/server";
import { Effect, Option, pipe, Stream } from "effect";
import { Headers } from "effect/unstable/http";

import { NaamioHttpClient } from "#src/lib/api-client/mod.js";
import { sessionTokenMiddleware } from "#src/lib/effect-bridge/middleware.js";
import { runAuthenticatedOnlyServerFn } from "#src/lib/effect-bridge/mod.js";

const allowedShapeNames = new Set(["passkey", "session", "user"]);

export const Route = createFileRoute("/api/shape/{$shapeName}")({
	server: {
		handlers: {
			GET: async (ctx) =>
				Effect.gen(function* () {
					const naamioHttpClient = yield* NaamioHttpClient;

					const shapeName = ctx.params.shapeName;

					if (!allowedShapeNames.has(shapeName)) {
						return new Response(null, { status: 404 });
					}

					const urlParams = getRequestUrl().searchParams;

					const response = yield* naamioHttpClient.get(`/api/${shapeName}/shape`, { urlParams });

					const body = Stream.toReadableStream(response.stream);
					const headers = pipe(response.headers, Headers.remove("Content-Encoding"), Headers.remove("Content-Length"));

					const maybeExistingVaryHeader = Option.fromUndefinedOr(Headers.get(headers, "Vary"));
					const newVaryHeaderValue =
						Option.isSome(maybeExistingVaryHeader) ? `${maybeExistingVaryHeader.value}, Cookie` : "Cookie";
					const headersWithVary = Headers.set(headers, "Vary", newVaryHeaderValue);

					return new Response(body, { headers: headersWithVary, status: response.status });
				}).pipe(Effect.withSpan(`@naamio/janus/shape/${ctx.params.shapeName}`), runAuthenticatedOnlyServerFn(ctx)),
		},
		middleware: [sessionTokenMiddleware],
	},
});
