import { defineConfig } from "eslint/config";

import core from "@naamio/eslint-config/core";
import react from "@naamio/eslint-config/react";
import node from "@naamio/eslint-config/node";
import stylex from "@naamio/eslint-config/stylex";
import lingui from "@naamio/eslint-config/lingui";

export default defineConfig(
	{
		extends: [core, react, node, stylex, lingui],
		ignores: ["eslint.config.js", "src/routeTree.gen.ts", "server.ts"],
		languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
	},
	{ rules: { "@typescript-eslint/only-throw-error": "off" } },
	{ files: ["vite.config.ts", "lingui.config.ts"], rules: { "import-x/no-default-export": "off" } },
	{
		files: ["src/routes/**"],
		rules: { "canonical/filename-no-index": "off", "@typescript-eslint/no-use-before-define": "off" },
	},
);
