import { redirect } from "@tanstack/react-router";
import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { isMarkdownPreferred } from "fumadocs-core/negotiation";

import { docsRoute } from "#src/lib/shared.js";
import { slugsToMarkdownPath } from "#src/lib/source.js";

const csrfMiddleware = createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" });

const llmMiddleware = createMiddleware().server(async ({ next, request }) => {
	const url = new URL(request.url);

	if (url.pathname.startsWith(docsRoute) && !url.pathname.endsWith(".md") && isMarkdownPreferred(request)) {
		const slugs = url.pathname
			.slice(docsRoute.length)
			.split("/")
			.filter((v) => v.length > 0);

		url.pathname = slugsToMarkdownPath(slugs).url;

		throw redirect(url);
	}

	return next();
});

export const startInstance = createStart(() => ({ requestMiddleware: [csrfMiddleware, llmMiddleware] }));
