import lingui from "eslint-plugin-lingui";
import { defineConfig } from "eslint/config";

export default defineConfig({
	name: "naamio/lingui",
	files: ["**/*.{ts,tsx,js,jsx}"],
	plugins: { lingui },
	rules: {
		"lingui/t-call-in-function": "error",
		"lingui/no-single-tag-to-translate": "error",
		"lingui/no-single-variables-to-translate": "error",
		"lingui/no-trans-inside-trans": "error",
		"lingui/no-expression-in-message": "error",
		"lingui/consistent-plural-format": "error",
	},
});
