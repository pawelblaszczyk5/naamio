import { defineConfig } from "eslint/config";

import core from "@naamio/eslint-config/core";
import react from "@naamio/eslint-config/react";
import stylex from "@naamio/eslint-config/stylex";

export default defineConfig(
	{
		extends: [core, react, stylex],
		languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
	},
	{ files: ["vite.config.ts", ".storybook/*"], rules: { "import-x/no-default-export": "off" } },
);
