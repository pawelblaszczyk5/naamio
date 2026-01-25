import { createMiddleware } from "@tanstack/react-start";
import { Effect, Option } from "effect";

import { getDecodedSessionTokenFromSessionCookie } from "#src/lib/cookies/mod.js";
import { runtime } from "#src/lib/effect-bridge/runtime.js";

export const sessionTokenMiddleware = createMiddleware().server(async (ctx) => {
	const sessionToken = await getDecodedSessionTokenFromSessionCookie().pipe(
		Effect.map(Option.getOrNull),
		Effect.withTracerEnabled(false),
		runtime.runPromise,
	);

	return ctx.next({ context: { sessionToken } });
});
