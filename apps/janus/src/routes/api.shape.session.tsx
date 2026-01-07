import { Headers } from "@effect/platform";
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { createFileRoute } from "@tanstack/react-router";
import { getRequestUrl } from "@tanstack/react-start/server";
import { Effect, Stream } from "effect";

import { NaamioHttpClient } from "#src/modules/api-client/mod.js";
import { runAuthenticatedOnlyServerFn, sessionTokenMiddleware } from "#src/modules/effect-bridge/mod.js";

export const Route = createFileRoute("/api/shape/session")({
	server: {
		handlers: {
			GET: async (ctx) =>
				Effect.gen(function* () {
					const naamioHttpClient = yield* NaamioHttpClient;

					const urlParams = Object.fromEntries(
						getRequestUrl()
							.searchParams.entries()
							.filter(([key]) => ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)),
					);

					const response = yield* naamioHttpClient.get("/api/session/shape", { urlParams });

					const readableStream = Stream.toReadableStream(response.stream);
					const newHeaders = Headers.remove(response.headers, ["content-encoding", "content-length"]);

					return new Response(readableStream, { headers: newHeaders, status: response.status });
				}).pipe(runAuthenticatedOnlyServerFn(ctx)),
		},
		middleware: [sessionTokenMiddleware],
	},
});
