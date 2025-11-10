import { defineConfig } from "eslint/config";

import core from "@naamio/eslint-config/core";

export default defineConfig(
	{
		languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
		extends: [core],
	},
	{ files: ["src/mod.ts"], rules: { "import-x/no-default-export": "off" } },
);
