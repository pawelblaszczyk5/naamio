import { AcceptLanguage } from "@remix-run/headers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { Effect } from "effect";

import type { UserModel } from "@naamio/schema/domain";

import { runServerFn } from "#src/lib/effect-bridge/mod.js";

export const getPreferredLanguage = createServerFn({ method: "GET" }).handler(async () =>
	Effect.gen(function* () {
		const header = getRequestHeader("Accept-Language");

		if (!header) {
			return "en-US";
		}

		const acceptLanguage = AcceptLanguage.from(header);
		const preferred = acceptLanguage.getPreferred(["en-US", "pl-PL"]) ?? "en-US";

		return preferred;
	}).pipe(
		Effect.withSpan("@naamio/janus/home/getPreferredLanguage"),
		Effect.ensureSuccessType<UserModel["language"]>(),
		runServerFn,
	),
);
