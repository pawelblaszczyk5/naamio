import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import { createRule } from "#src/utils.js";

export const rule = createRule({
	create: (context) => ({
		JSXOpeningElement: (node) => {
			if (node.attributes.length === 0) {
				return;
			}

			const stylexPropAttribute = node.attributes.find(
				(attr) =>
					attr.type === AST_NODE_TYPES.JSXSpreadAttribute
					&& attr.argument.type === AST_NODE_TYPES.CallExpression
					&& attr.argument.callee.type === AST_NODE_TYPES.MemberExpression
					&& attr.argument.callee.object.type === AST_NODE_TYPES.Identifier
					&& attr.argument.callee.object.name === "stylex"
					&& attr.argument.callee.property.type === AST_NODE_TYPES.Identifier
					&& attr.argument.callee.property.name === "props",
			);

			const firstAttribute = node.attributes.at(0);
			const lastAttribute = node.attributes.at(-1);

			if (!stylexPropAttribute || !lastAttribute || !firstAttribute) {
				return;
			}

			if (stylexPropAttribute === lastAttribute) {
				return;
			}

			context.report({
				node: stylexPropAttribute,
				messageId: "mustBeLast",
				fix(fixer) {
					const attributesCorrectlyOrdered = node.attributes
						.filter((attribute) => attribute !== stylexPropAttribute)
						.concat(stylexPropAttribute);

					const newText = attributesCorrectlyOrdered.map((attr) => context.sourceCode.getText(attr)).join(" ");

					return fixer.replaceTextRange([firstAttribute.range[0], lastAttribute.range[1]], newText);
				},
			});
		},
	}),
	defaultOptions: [],
	meta: {
		docs: {
			description:
				"Ensures `stylex.props()` call result spread is the last prop on JSX element. It improves both readability, and maintainability, since you should never override props returned by it.",
			recommended: true,
			requiresTypeChecking: false,
		},
		fixable: "code",
		messages: { mustBeLast: "`stylex.props()` call result spread must be the last prop on JSX element." },
		schema: [],
		type: "problem",
	},
	name: "enforce-stylex-call-as-last-prop",
});
