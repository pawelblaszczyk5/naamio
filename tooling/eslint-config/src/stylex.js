import { defineConfig } from "eslint/config";
import stylex from "@stylexjs/eslint-plugin";

export default defineConfig({
	name: "naamio/stylex",
	files: ["**/*.{ts,tsx,js,jsx}"],
	plugins: { stylex },
	rules: {
		"stylex/enforce-extension": "error",
		"stylex/valid-shorthands": ["error", { preferInline: true }],
		"stylex/no-unused": "error",
		"stylex/no-legacy-contextual-styles": "error",
	},
});
