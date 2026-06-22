import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";

import { source } from "#src/lib/source.js";

const server = createFromSource(source, { language: "english" });

export const Route = createFileRoute("/api/search")({
	server: { handlers: { GET: async ({ request }) => server.GET(request) } },
});
