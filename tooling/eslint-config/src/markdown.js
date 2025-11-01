import markdown from "@eslint/markdown";
import { defineConfig } from "eslint/config";

export default defineConfig({
	name: "naamio/markdown",
	files: ["**/*.md"],
	extends: [markdown.configs.recommended],
	language: "markdown/gfm",
	rules: { "markdown/no-bare-urls": "error", "markdown/no-duplicate-headings": "error", "markdown/no-html": "error" },
});
