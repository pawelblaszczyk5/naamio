import { defineConfig } from "eslint/config";
import tanstackRouter from "@tanstack/eslint-plugin-router";

export default defineConfig({
	name: "naamio/tanstack-router",
	files: ["**/*.{ts,tsx,js,jsx}"],
	plugins: { "@tanstack/router": tanstackRouter },
	rules: { "@tanstack/router/create-route-property-order": "error" },
});
