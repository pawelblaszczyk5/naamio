import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
	MarkdownCopyButton,
	ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import { Suspense } from "react";

import browserCollections from "#collections/browser.js";
import { useMDXComponents } from "#src/components/mdx.js";
import { baseOptions } from "#src/lib/layout.shared.js";
import { gitConfig } from "#src/lib/shared.js";
import { slugsToMarkdownPath, source } from "#src/lib/source.js";

// eslint-disable-next-line react-refresh/only-export-components -- this is Fumadocs setup
const Page = () => {
	const { markdownUrl, pageTree, path } = useFumadocsLoader(Route.useLoaderData());

	return (
		<DocsLayout {...baseOptions()} tree={pageTree}>
			<Suspense>{clientLoader.useContent(path, { markdownUrl, path })}</Suspense>
		</DocsLayout>
	);
};

export const Route = createFileRoute("/docs/$")({
	component: Page,
	loader: async ({ params }) => {
		const slugs = params._splat?.split("/") ?? [];
		const data = await serverLoader({ data: slugs });

		await clientLoader.preload(data.path);
		return data;
	},
});

const serverLoader = createServerFn({ method: "GET" })
	.validator((slugs: Array<string>) => slugs)
	.handler(async ({ data: slugs }) => {
		const page = source.getPage(slugs);

		if (!page) {
			throw notFound();
		}

		return {
			markdownUrl: slugsToMarkdownPath(page.slugs).url,
			pageTree: await source.serializePageTree(source.getPageTree()),
			path: page.path,
		};
	});

const clientLoader = browserCollections.docs.createClientLoader({
	component: ({ default: MDX, frontmatter, toc }, { markdownUrl, path }: { markdownUrl: string; path: string }) => (
		<DocsPage toc={toc}>
			<DocsTitle>{frontmatter.title}</DocsTitle>
			<DocsDescription>{frontmatter.description}</DocsDescription>
			<div className="flex flex-row gap-2 items-center border-b -mt-4 pb-6">
				<MarkdownCopyButton markdownUrl={markdownUrl} />
				<ViewOptionsPopover
					githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/apps/minerva/content/docs/${path}`}
					markdownUrl={markdownUrl}
				/>
			</div>
			<DocsBody>
				{/* eslint-disable-next-line react-hooks/rules-of-hooks -- this is a component rendered by Fumadocs */}
				<MDX components={useMDXComponents()} />
			</DocsBody>
		</DocsPage>
	),
});
