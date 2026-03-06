import { defineMain } from "@storybook/react-vite/node";

const main = defineMain({
	addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
	core: { allowedHosts: ["vulcan.naamio.orb.local"] },
	framework: { name: "@storybook/react-vite", options: { strictMode: true } },
	stories: ["../src/stories/**/*.stories.@(ts|tsx)"],
});

export default main;
