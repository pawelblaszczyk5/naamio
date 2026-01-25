import { Headers } from "@effect/platform";
import { createFileRoute } from "@tanstack/react-router";
import { getRequestUrl } from "@tanstack/react-start/server";
import { Effect, Option, Stream } from "effect";

import { NaamioHttpClient } from "#src/lib/api-client/mod.js";
import { sessionTokenMiddleware } from "#src/lib/effect-bridge/middleware.js";
import { runAuthenticatedOnlyServerFn } from "#src/lib/effect-bridge/mod.js";

const allowedShapeNames = new Set(["session", "user"]);

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
					const headers = Headers.remove(response.headers, ["content-encoding", "content-length"]);

					const maybeExistingVaryHeader = Headers.get(headers, "Vary");
					const newVaryHeaderValue =
						Option.isSome(maybeExistingVaryHeader) ? `${maybeExistingVaryHeader.value}, Cookie` : "Cookie";
					const headersWithVary = Headers.set(headers, "Vary", newVaryHeaderValue);

					return new Response(body, { headers: headersWithVary, status: response.status });
				}).pipe(Effect.withSpan(`@naamio/janus/shape/${ctx.params.shapeName}`), runAuthenticatedOnlyServerFn(ctx)),
		},
		middleware: [sessionTokenMiddleware],
	},
});
