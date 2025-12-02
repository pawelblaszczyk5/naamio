import { defineMain } from "@storybook/react-vite/node";

// NOTE: this is typed as unknown, because it uses some unused types and I don't need it anyway
const main: unknown = defineMain({
	addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
	framework: { name: "@storybook/react-vite", options: { strictMode: true } },
	stories: ["../src/stories/**/*.stories.@(ts|tsx)"],
});

export default main;
