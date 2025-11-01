import { defineConfig } from "eslint/config";

import core from "@naamio/eslint-config/core";
import react from "@naamio/eslint-config/react";
import stylex from "@naamio/eslint-config/stylex";

export default defineConfig({
	languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
	extends: [core, react, stylex],
});
