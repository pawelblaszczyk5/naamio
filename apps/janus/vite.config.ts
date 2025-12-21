import type { BabelOptions } from "@vitejs/plugin-react";

import { lingui } from "@lingui/vite-plugin";
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
	const pipelineDependentPlugins =
		isPostCssPipeline ?
			[["@babel/plugin-syntax-jsx", {}]]
		:	[
				["@lingui/babel-plugin-lingui-macro", {}],
				["babel-plugin-react-compiler", {}],
			];

	const config: { plugins: NonNullable<BabelOptions["plugins"]>; presets: NonNullable<BabelOptions["presets"]> } = {
		plugins: [
			...pipelineDependentPlugins,
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
		presets: isPostCssPipeline ? ["@babel/preset-typescript"] : [],
	};

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
			inspect(),
			tanstackStart({ router: { addExtensions: true } }),
			react({ babel: getBabelConfig({ isDevelopment, isPostCssPipeline: false }) }),
			lingui({ failOnCompileError: true, failOnMissing: true }),
			FontaineTransform.vite({ fallbacks: {} }),
		],
		server: { host: true, port: 6_200, strictPort: true },
	};
});
