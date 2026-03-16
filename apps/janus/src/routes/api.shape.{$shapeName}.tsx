import { createFileRoute } from "@tanstack/react-router";
import { getRequestUrl } from "@tanstack/react-start/server";
import { Effect, Match, Option, Schema, Stream } from "effect";
import { Headers } from "effect/unstable/http";

import { NaamioHttpClient, NaamioUrlBuilder } from "#src/lib/api-client/mod.js";
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

export const Route = createFileRoute("/api/shape/{$shapeName}")({
	server: {
		handlers: {
			GET: async (ctx) =>
				Effect.gen(function* () {
					const naamioHttpClient = yield* NaamioHttpClient;
					const naamioUrlBuilder = yield* NaamioUrlBuilder;

					const shapeName = ctx.params.shapeName;

					if (!isShapeName(shapeName)) {
						return new Response(null, { status: 404 });
					}

					const query = Object.fromEntries(getRequestUrl().searchParams);

					const url = Match.value(shapeName).pipe(
						Match.when("user", () => naamioUrlBuilder("User", "GET /api/user/shape", { query })),
						Match.when("session", () => naamioUrlBuilder("Session", "GET /api/session/shape", { query })),
						Match.when("passkey", () => naamioUrlBuilder("Passkey", "GET /api/passkey/shape", { query })),
						Match.when("conversation", () => naamioUrlBuilder("Chat", "GET /api/chat/conversation/shape", { query })),
						Match.when("message", () => naamioUrlBuilder("Chat", "GET /api/chat/message/shape", { query })),
						Match.when("message-part", () => naamioUrlBuilder("Chat", "GET /api/chat/message-part/shape", { query })),
						Match.when("inflight-chunk", () =>
							naamioUrlBuilder("Chat", "GET /api/chat/inflight-chunk/shape", { query }),
						),
						Match.exhaustive,
					);

					const response = yield* naamioHttpClient.get(url);

					const body = Stream.toReadableStream(response.stream);
					const headers = Headers.removeMany(response.headers, ["Content-Encoding", "Content-Length"]);

					const varyValue = Option.match(Headers.get(headers, "Vary"), {
						onNone: () => "Cookie",
						onSome: (existingVary) => `${existingVary}, Cookie`,
					});
					const headersWithVary = Headers.set(headers, "Vary", varyValue);

					return new Response(body, { headers: headersWithVary, status: response.status });
				}).pipe(Effect.withSpan(`@naamio/janus/shape/${ctx.params.shapeName}`), runAuthenticatedOnlyServerFn(ctx)),
		},
		middleware: [sessionTokenMiddleware],
	},
});
