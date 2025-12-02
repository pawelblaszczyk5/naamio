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
			unstable_moduleResolution: { type: "commonJS" },
		}),
		react({ babel: { plugins: [["babel-plugin-react-compiler", {}]] } }),
		FontaineTransform.vite({ fallbacks: {} }),
	],
});
