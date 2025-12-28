import { defineConfig } from "eslint/config";

import core from "@naamio/eslint-config/core";
import node from "@naamio/eslint-config/node";

export default defineConfig({
	languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
	extends: [core, node],
});
