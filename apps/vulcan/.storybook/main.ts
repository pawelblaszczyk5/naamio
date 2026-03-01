import { defineMain } from "@storybook/react-vite/node";

const main = defineMain({
	addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
	framework: { name: "@storybook/react-vite", options: { strictMode: true } },
	stories: ["../src/stories/**/*.stories.@(ts|tsx)"],
	viteFinal: (config) => {
		if (config.server) {
			config.server.allowedHosts = ["vulcan.naamio.orb.local"];

			if (typeof config.server.hmr === "object") {
				// eslint-disable-next-line fp/no-delete -- I'm not 100% sure why Storybook is setting this, this makes it impossible to work behind reverse proxy
				delete config.server.hmr.port;
			}
		}

		return config;
	},
});

export default main;
