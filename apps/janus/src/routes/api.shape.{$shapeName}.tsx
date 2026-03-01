import { createFileRoute } from "@tanstack/react-router";
import { getRequestUrl } from "@tanstack/react-start/server";
import { Effect, Option, pipe, Schema, Stream } from "effect";
import { Headers } from "effect/unstable/http";

import { NaamioHttpClient } from "#src/lib/api-client/mod.js";
import { sessionTokenMiddleware } from "#src/lib/effect-bridge/middleware.js";
import { runAuthenticatedOnlyServerFn } from "#src/lib/effect-bridge/mod.js";

const ShapeName = Schema.Literals([
	"passkey",
	"session",
	"user",
	"conversation",
	"message",
	"message-part",
	"inflight-chunk",
]);

const isShapeName = Schema.is(ShapeName);

type AllowedShapeName = (typeof ShapeName)["Type"];

const SHAPE_URL: Record<AllowedShapeName, string> = {
	conversation: "/api/chat/conversation/shape",
	"inflight-chunk": "/api/chat/inflight-chunk/shape",
	message: "/api/chat/message/shape",
	"message-part": "/api/chat/message-part/shape",
	passkey: "/api/passkey/shape",
	session: "/api/session/shape",
	user: "/api/user/shape",
};

export const Route = createFileRoute("/api/shape/{$shapeName}")({
	server: {
		handlers: {
			GET: async (ctx) =>
				Effect.gen(function* () {
					const naamioHttpClient = yield* NaamioHttpClient;

					const shapeName = ctx.params.shapeName;

					if (!isShapeName(shapeName)) {
						return new Response(null, { status: 404 });
					}

					const urlParams = getRequestUrl().searchParams;

					const response = yield* naamioHttpClient.get(SHAPE_URL[shapeName], { urlParams });

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
