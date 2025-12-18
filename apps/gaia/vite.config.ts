import type { BabelOptions } from "@vitejs/plugin-react";

// @ts-expect-error - untyped module
import stylexPlugin from "@stylexjs/postcss-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { FontaineTransform } from "fontaine";
import { defineConfig } from "vite";
import inspect from "vite-plugin-inspect";

const typedStylexPlugin = stylexPlugin as (options: {
	babelConfig?: unknown;
	cwd?: string;
	exclude?: Array<string>;
	include?: Array<string>;
	useCSSLayers?: boolean;
}) => never;

const getBabelConfig = ({
	isDevelopment,
	isPostCssPipeline,
}: {
	isDevelopment: boolean;
	isPostCssPipeline: boolean;
}) => {
	const config: { plugins: NonNullable<BabelOptions["plugins"]>; presets: NonNullable<BabelOptions["presets"]> } = {
		plugins: [
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
		presets: [],
	};

	if (isPostCssPipeline) {
		config.plugins.unshift(["babel-plugin-react-compiler", {}], ["@babel/plugin-syntax-jsx", {}]);
		config.presets.push("@babel/preset-typescript");
	}

	return config;
};

export default defineConfig((environment) => {
	const isDevelopment = environment.command === "serve";

	return {
		build: { assetsInlineLimit: 0 },
		css: {
			postcss: {
				plugins: [
					typedStylexPlugin({
						babelConfig: { ...getBabelConfig({ isDevelopment, isPostCssPipeline: true }), babelrc: false },
						include: ["./src/**/*.{js,jsx,ts,tsx}", "../../packages/*/dist/src/**/*.{js,jsx}"],
						useCSSLayers: true,
					}),
				],
			},
		},
		plugins: [
			tanstackStart({ router: { addExtensions: true } }),
			react({ babel: getBabelConfig({ isDevelopment, isPostCssPipeline: false }) }),
			inspect(),
			FontaineTransform.vite({ fallbacks: {} }),
		],
		server: { host: true, port: 6_200, strictPort: true },
	};
});
