// @ts-expect-error - untyped module
import stylexPlugin from "@stylexjs/postcss-plugin";
import react from "@vitejs/plugin-react";
import { FontaineTransform } from "fontaine";
import { defineConfig } from "vite";

const typedStylexPlugin = stylexPlugin as (options: {
	babelConfig?: unknown;
	cwd?: string;
	exclude?: Array<string>;
	include?: Array<string>;
	useCSSLayers?: boolean;
}) => never;

const getBabelConfig = (isDevelopment: boolean) => ({
	plugins: [
		["babel-plugin-react-compiler", {}],
		["@babel/plugin-syntax-jsx", {}],
		[
			"@stylexjs/babel-plugin",
			{
				dev: isDevelopment,
				enableMediaQueryOrder: true,
				importSources: ["@naamio/stylex"],
				treeshakeCompensation: true,
				unstable_moduleResolution: { type: "commonJS" },
			},
		],
	],
	presets: ["@babel/preset-typescript"],
});

export default defineConfig((environment) => {
	const isDevelopment = environment.command === "serve";

	return {
		css: {
			postcss: {
				plugins: [
					typedStylexPlugin({
						babelConfig: { ...getBabelConfig(isDevelopment), babelrc: false },
						include: ["./src/**/*.{js,jsx,ts,tsx}", "../../packages/*/dist/src/**/*.{js,jsx}"],
						useCSSLayers: true,
					}),
				],
			},
		},
		plugins: [react({ babel: getBabelConfig(isDevelopment) }), FontaineTransform.vite({ fallbacks: {} })],
	};
});
