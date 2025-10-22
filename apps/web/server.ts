import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";

import handler from "./dist/server/server.js";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;
const ONE_HOUR_IN_SECONDS = 60 * 60;

const cache = ({ immutable, seconds }: { immutable: boolean; seconds: number }) =>
	createMiddleware(async (ctx, next) => {
		await next();

		if (!ctx.res.ok || ctx.res.headers.has("cache-control")) {
			return;
		}

		ctx.res.headers.set("cache-control", `public, max-age=${seconds.toString()}${immutable ? ", immutable" : ""}`);
	});

const app = new Hono();

app.use("/assets/*", cache({ immutable: true, seconds: ONE_YEAR_IN_SECONDS }), serveStatic({ root: "./dist/client" }));
app.use("*", cache({ immutable: false, seconds: ONE_HOUR_IN_SECONDS }), serveStatic({ root: "./dist/client" }));
app.use("*", async (ctx) => handler.fetch(ctx.req.raw) as Promise<Response>);

serve({ fetch: app.fetch, port: 3_200 });
