import { defineConfig } from "eslint/config";
import stylex from "@stylexjs/eslint-plugin";

export default defineConfig({
	name: "naamio/stylex",
	files: ["**/*.{ts,tsx,js,jsx}"],
	plugins: { stylex },
	rules: {
		"stylex/enforce-extension": ["error", { validImports: ["@naamio/stylex"] }],
		"stylex/valid-shorthands": ["error", { validImports: ["@naamio/stylex"], preferInline: true }],
		"stylex/no-unused": ["error", { validImports: ["@naamio/stylex"] }],
		"stylex/no-legacy-contextual-styles": ["error", { validImports: ["@naamio/stylex"] }],
	},
});
