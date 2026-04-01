import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import stylistic from "@stylistic/eslint-plugin";
import reactDom from "eslint-plugin-react-dom";
import reactNamingConvention from "eslint-plugin-react-naming-convention";
import reactWebApi from "eslint-plugin-react-web-api";
import reactJsx from "eslint-plugin-react-jsx";
import react from "eslint-plugin-react-x";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import eslintReactKit from "@eslint-react/kit";

// cspell:ignore innerhtml, textnodes, setstate

export function jsxBooleanValue() {
	return (context) => ({
		JSXAttribute(node) {
			const { value } = node;

			if (value?.type !== "JSXExpressionContainer") return;
			if (value.expression.type !== "Literal" || value.expression.value !== true) return;

			context.report({
				node,
				message: "Omit the value for boolean attributes.",
				fix: (fixer) => fixer.removeRange([node.name.range[1], value.range[1]]),
			});
		},
	});
}

export function jsxFragments() {
	return (context) => {
		function reportSyntaxPreferred(node, pattern) {
			const hasAttributes = node.attributes.length > 0;

			if (hasAttributes) return;

			context.report({
				node,
				message: `Use shorthand fragment syntax '<>...</>' instead of '<${pattern}>...</${pattern}'.`,
				fix(fixer) {
					const closing = node.parent?.closingElement;
					if (!closing) return null;
					return [fixer.replaceText(node, "<>"), fixer.replaceText(closing, "</>")];
				},
			});
		}

		return {
			JSXOpeningElement(node) {
				const name = node.name;

				if (name.type === "JSXIdentifier" && name.name === "Fragment") {
					reportSyntaxPreferred(node, "Fragment");

					return;
				}

				if (name.type !== "JSXMemberExpression") return;
				if (name.object.type !== "JSXIdentifier" || name.object.name !== "React") return;
				if (name.property.type !== "JSXIdentifier" || name.property.name !== "Fragment") return;

				reportSyntaxPreferred(node, "React.Fragment");
			},
		};
	};
}

export default defineConfig({
	name: "naamio/react",
	files: ["**/*.{ts,tsx,js,jsx}"],
	plugins: {
		react: react,
		"react-dom": reactDom,
		"react-web-api": reactWebApi,
		"react-refresh": reactRefresh,
		"react-naming-convention": reactNamingConvention,
		stylistic: stylistic,
		"react-hooks": reactHooks,
		"react-jsx": reactJsx,
	},
	extends: [
		reactHooks.configs.flat["recommended-latest"],
		jsxA11y.flatConfigs.strict,
		eslintReactKit().use(jsxBooleanValue).use(jsxFragments).getConfig(),
	],
	rules: {
		// react

		"react/no-forward-ref": "error",
		"react/no-access-state-in-setstate": "error",
		"react/no-array-index-key": "error",
		"react/no-children-count": "error",
		"react/no-children-for-each": "error",
		"react/no-children-map": "error",
		"react/no-children-only": "error",
		"react/no-children-to-array": "error",
		"react/no-class-component": "error",
		"react/no-clone-element": "error",
		"react/no-component-will-mount": "error",
		"react/no-component-will-receive-props": "error",
		"react/no-component-will-update": "error",
		"react/no-context-provider": "error",
		"react/no-create-ref": "error",
		"react/no-direct-mutation-state": "error",
		"react/no-duplicate-key": "error",
		"react/no-forward-ref": "error",
		"react/no-implicit-children": "error",
		"react/no-implicit-key": "error",
		"react/no-implicit-ref": "error",
		"react/no-leaked-conditional-rendering": "error",
		"react/no-missing-component-display-name": "error",
		"react/no-missing-context-display-name": "error",
		"react/no-missing-key": "error",
		"react/no-nested-component-definitions": "error",
		"react/no-redundant-should-component-update": "error",
		"react/no-set-state-in-component-did-mount": "error",
		"react/no-set-state-in-component-did-update": "error",
		"react/no-set-state-in-component-will-update": "error",
		"react/no-unnecessary-use-callback": "error",
		"react/no-unnecessary-use-memo": "error",
		"react/no-unnecessary-use-prefix": "error",
		"react/no-unsafe-component-will-mount": "error",
		"react/no-unsafe-component-will-receive-props": "error",
		"react/no-unsafe-component-will-update": "error",
		"react/no-unstable-default-props": "error",
		"react/no-unused-class-component-members": "error",
		"react/no-unused-state": "error",
		"react/no-use-context": "error",
		"react/prefer-destructuring-assignment": "error",
		"react/use-state": "error",

		// react-jsx
		"react-jsx/no-children-prop": "error",
		"react-jsx/no-comment-textnodes": "error",
		"react-jsx/no-useless-fragment": "error",
		"react-jsx/no-key-after-spread": "error",

		// react-dom
		"react-dom/no-void-elements-with-children": "error",
		"react-dom/no-dangerously-set-innerhtml": "error",
		"react-dom/no-dangerously-set-innerhtml-with-children": "error",
		"react-dom/no-find-dom-node": "error",
		"react-dom/no-flush-sync": "error",
		"react-dom/no-missing-button-type": "error",
		"react-dom/no-missing-iframe-sandbox": "error",
		"react-dom/no-render-return-value": "error",
		"react-dom/no-script-url": "error",
		"react-dom/no-unsafe-iframe-sandbox": "error",
		"react-dom/no-unsafe-target-blank": "error",
		"react-dom/no-render": "error",
		"react-dom/no-hydrate": "error",

		// react-web-api
		"react-web-api/no-leaked-event-listener": "error",
		"react-web-api/no-leaked-interval": "error",
		"react-web-api/no-leaked-resize-observer": "error",
		"react-web-api/no-leaked-timeout": "error",

		// react-naming-convention
		"react-naming-convention/ref-name": "error",
		"react-naming-convention/context-name": "error",
		"react-naming-convention/id-name": "error",

		// stylistic
		"stylistic/jsx-curly-brace-presence": ["error", { propElementValues: "always", children: "never", props: "never" }],
		"stylistic/jsx-self-closing-comp": ["error"],

		// react-hooks
		"react-hooks/exhaustive-deps": "error",
		// NOTE this is enabled, because otherwise it allows for silently skipping lint rules, I'm not 100% sure about this, but let it be this way for now
		"react-hooks/todo": "error",

		// react-refresh
		"react-refresh/only-export-components": ["error", { allowConstantExport: true }],

		// jsx-a11y overrides
		"jsx-a11y/no-autofocus": "off",
	},
});
