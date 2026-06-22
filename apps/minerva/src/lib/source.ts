import { loader } from "fumadocs-core/source";

import { docs } from "#collections/server.js";
import { docsRoute } from "#src/lib/shared.js";

export const source = loader({ baseUrl: docsRoute, plugins: [], source: docs.toFumadocsSource() });

const markdownExtensionRegex = /\.md$/u;

export const markdownPathToSlugs = (segments: Array<string>) => {
	if (segments.length === 0) {
		return [];
	}

	const out = [...segments];

	// @ts-expect-error -- test test
	out[out.length - 1] = out.at(-1).replace(markdownExtensionRegex, "");

	if (out.length === 1 && out[0] === "index") {
		out.pop();
	}

	return out;
};

export const slugsToMarkdownPath = (slugs: Array<string>) => {
	const segments = [...slugs];

	if (segments.length === 0) {
		segments.push("index.md");
	} else {
		// eslint-disable-next-line @typescript-eslint/restrict-plus-operands -- test test
		segments[segments.length - 1] += ".md";
	}

	return { segments, url: `${docsRoute}/${segments.join("/")}` };
};

export const getLLMText = async (page: (typeof source)["$inferPage"]) => {
	const processed = await page.data.getText("processed");

	return `# ${page.data.title} (${page.url})

${processed}`;
};
