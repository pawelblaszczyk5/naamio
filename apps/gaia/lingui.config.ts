import { defineConfig } from "@lingui/conf";

export default defineConfig({
	catalogs: [{ include: ["src"], path: "<rootDir>/src/locales/{locale}" }],
	locales: ["pl-PL", "en-US"],
	orderBy: "origin",
	sourceLocale: "en-US",
});
