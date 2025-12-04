// cspell:ignore lightningcss

import stylex from "@stylexjs/unplugin";
import react from "@vitejs/plugin-react";
import { FontaineTransform } from "fontaine";
import { defineConfig } from "vite";

const stylexWithFixedTypes = stylex as unknown as (typeof stylex)["default"];

export default defineConfig({
	plugins: [
		stylexWithFixedTypes.vite({
			devPersistToDisk: true,
			enableMediaQueryOrder: true,
			importSources: ["@naamio/stylex"],
			lightningcssOptions: { minify: process.env["NODE_ENV"] === "production" },
			unstable_moduleResolution: { type: "commonJS" },
			useCSSLayers: true,
		}),
		react({ babel: { plugins: [["babel-plugin-react-compiler", {}]] } }),
		FontaineTransform.vite({ fallbacks: {} }),
	],
});
