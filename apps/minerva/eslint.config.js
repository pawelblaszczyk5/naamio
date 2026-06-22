import { defineConfig } from "eslint/config";

import core from "@naamio/eslint-config/core";
import react from "@naamio/eslint-config/react";
import node from "@naamio/eslint-config/node";
import tanstackRouter from "@naamio/eslint-config/tanstack-router";

export default defineConfig(
	{
		extends: [core, react, node, tanstackRouter],
		ignores: ["eslint.config.js", "src/routeTree.gen.ts", "server.ts"],
		languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
	},
	{ files: ["vite.config.ts", "source.config.ts"], rules: { "import-x/no-default-export": "off" } },
	{
		files: ["src/routes/**"],
		rules: { "naamio/no-index-file": "off", "@typescript-eslint/no-use-before-define": "off" },
	},
);
