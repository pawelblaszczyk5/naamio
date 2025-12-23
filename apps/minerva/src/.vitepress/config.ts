// cspell:words timescaledb

import { defineConfig } from "vitepress";

export default defineConfig({
	cacheDir: "../node_modules/.cache/vitepress",
	description: "Project documentation",
	head: [["link", { href: "/naamio.svg", rel: "icon" }]],
	lastUpdated: true,
	outDir: "../dist/",
	themeConfig: {
		nav: [
			{ link: "/", text: "Home" },
			{ activeMatch: "general", link: "/general/whats-naamio", text: "General" },
			{ activeMatch: "development", link: "/development/intro", text: "Development" },
		],
		outline: "deep",
		search: { provider: "local" },
		sidebar: [
			{
				collapsed: false,
				items: [
					{ link: "/general/whats-naamio", text: "What's Naamio?" },
					{ link: "/general/features", text: "Features" },
				],
				text: "General",
			},
			{
				collapsed: false,
				items: [
					{ link: "/development/intro", text: "Intro" },
					{ link: "/development/architecture", text: "Architecture" },
					{ link: "/development/auth", text: "Auth" },
				],
				text: "Development",
			},
		],
		socialLinks: [{ icon: "github", link: "https://github.com/pawelblaszczyk5/naamio" }],
	},
	title: "Naamio",
	vite: { server: { allowedHosts: ["minerva.naamio.orb.local"], port: 6_202 } },
});
