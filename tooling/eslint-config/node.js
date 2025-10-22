import n from "eslint-plugin-n";
import { defineConfig } from "eslint/config";

export default defineConfig({
	name: "naamio/node",
	extends: [n.configs["flat/recommended"]],
	rules: {
		"n/no-missing-import": "off",
		"n/no-unpublished-import": "off",
		"n/no-path-concat": "error",
		"n/no-process-env": "error",
		"n/no-unsupported-features/es-builtins": ["error", { ignores: [] }],
		"n/no-unsupported-features/node-builtins": ["error", { ignores: ["ReadableStream"] }],
		"n/prefer-global/buffer": "error",
		"n/prefer-promises/dns": "error",
		"n/prefer-promises/fs": "error",
	},
	settings: { node: { version: "24.9.0" } },
});
