import type { MDXComponents } from "mdx/types";

import defaultMdxComponents from "fumadocs-ui/mdx";

export const getMDXComponents = (components?: MDXComponents) =>
	({ ...defaultMdxComponents, ...components }) satisfies MDXComponents;

export const useMDXComponents = getMDXComponents;

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
