import { createFileRoute } from "@tanstack/react-router";
import { llms } from "fumadocs-core/source";

import { source } from "#src/lib/source.js";

export const Route = createFileRoute("/llms.txt")({
	server: { handlers: { GET: () => new Response(llms(source).index()) } },
});
