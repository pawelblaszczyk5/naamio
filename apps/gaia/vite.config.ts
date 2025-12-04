// cspell:ignore lightningcss

import stylex from "@stylexjs/unplugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { FontaineTransform } from "fontaine";
import { defineConfig } from "vite";
import inspect from "vite-plugin-inspect";

const stylexWithFixedTypes = stylex as unknown as (typeof stylex)["default"];

export default defineConfig({
	build: { assetsInlineLimit: 0 },
	plugins: [
		stylexWithFixedTypes.vite({
			devPersistToDisk: true,
			enableMediaQueryOrder: true,
			importSources: ["@naamio/stylex"],
			// eslint-disable-next-line n/no-process-env -- that's a fine simple use to control the minification process
			lightningcssOptions: { minify: process.env["NODE_ENV"] === "production" },
			unstable_moduleResolution: { type: "commonJS" },
			useCSSLayers: true,
		}),
		tanstackStart({ router: { addExtensions: true } }),
		react({ babel: { plugins: [["babel-plugin-react-compiler", {}]] } }),
		inspect(),
		FontaineTransform.vite({ fallbacks: {} }),
	],
	server: { host: true, port: 6_200, strictPort: true },
});
