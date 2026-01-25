import type { Context } from "hono";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

import handler from "./dist/server/server.js";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;
const ONE_HOUR_IN_SECONDS = 60 * 60;
const PORT = 6_200;

const addCacheHeaders =
	({ immutable, seconds }: { immutable: boolean; seconds: number }) =>
	(_: unknown, context: Context) => {
		context.res.headers.set("cache-control", `public, max-age=${seconds.toString()}${immutable ? ", immutable" : ""}`);
	};

const app = new Hono();

app.use(
	"/assets/*",
	serveStatic({ root: "./dist/client", onFound: addCacheHeaders({ immutable: true, seconds: ONE_YEAR_IN_SECONDS }) }),
);

app.use(
	"*",
	serveStatic({ root: "./dist/client", onFound: addCacheHeaders({ immutable: false, seconds: ONE_HOUR_IN_SECONDS }) }),
);

app.use("*", async (context) => handler.fetch(context.req.raw) as Promise<Response>);

serve({ fetch: app.fetch, port: PORT }, (info) => {
	console.log(`Listening on http://0.0.0.0:${info.port}`);
});
