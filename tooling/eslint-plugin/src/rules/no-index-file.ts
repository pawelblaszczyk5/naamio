import path from "node:path";

import { createRule } from "#src/utils.js";

const parseFilename = (filename: string) => {
	const resolvedFilename = path.resolve(filename);
	const extension = path.extname(resolvedFilename);

	return path.basename(resolvedFilename, extension);
};

export const rule = createRule({
	create: (context) => ({
		Program: (node) => {
			const parsed = parseFilename(context.filename);

			const isIndex = parsed === "index";

			if (!isIndex) {
				return;
			}

			context.report({ messageId: "noIndexFile", node });
		},
	}),
	defaultOptions: [],
	meta: {
		docs: {
			description:
				"Ensures that files aren't named `index.ts`. This name is discouraged because it has some magical properties regarded to module resolution. You should usually use `mod.ts` instead.",
			recommended: true,
			requiresTypeChecking: false,
		},
		messages: { noIndexFile: "`index.ts` files are disallowed" },
		schema: [],
		type: "problem",
	},
	name: "no-index-file",
});
