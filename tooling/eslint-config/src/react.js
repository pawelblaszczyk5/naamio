import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import stylistic from "@stylistic/eslint-plugin";
import reactDom from "eslint-plugin-react-dom";
import reactHooksExtra from "eslint-plugin-react-hooks-extra";
import reactNamingConvention from "eslint-plugin-react-naming-convention";
import reactWebApi from "eslint-plugin-react-web-api";
import react from "eslint-plugin-react-x";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

// cspell:ignore innerhtml, textnodes, setstate

export default defineConfig({
	name: "naamio/react",
	files: ["**/*.{ts,tsx,js,jsx}"],
	plugins: {
		react: react,
		"react-dom": reactDom,
		"react-web-api": reactWebApi,
		"react-hooks-extra": reactHooksExtra,
		"react-refresh": reactRefresh,
		"react-naming-convention": reactNamingConvention,
		stylistic: stylistic,
		"react-hooks": reactHooks,
	},
	extends: [reactHooks.configs.flat["recommended-latest"], jsxA11y.flatConfigs.strict],
	rules: {
		// react
		"react/jsx-dollar": "error",
		"react/jsx-key-before-spread": "error",
		"react/jsx-no-comment-textnodes": "error",
		"react/jsx-no-iife": "error",
		"react/jsx-shorthand-boolean": "error",
		"react/jsx-shorthand-fragment": "error",
		"react/no-useless-forward-ref": "error",
		"react/no-access-state-in-setstate": "error",
		"react/no-array-index-key": "error",
		"react/no-children-count": "error",
		"react/no-children-for-each": "error",
		"react/no-children-map": "error",
		"react/no-children-only": "error",
		"react/no-children-prop": "error",
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
		"react/no-implicit-key": "error",
		"react/no-leaked-conditional-rendering": "error",
		"react/no-missing-component-display-name": "error",
		"react/no-missing-context-display-name": "error",
		"react/no-missing-key": "error",
		"react/no-nested-component-definitions": "error",
		"react/no-redundant-should-component-update": "error",
		"react/no-set-state-in-component-did-mount": "error",
		"react/no-set-state-in-component-did-update": "error",
		"react/no-set-state-in-component-will-update": "error",
		"react/no-unnecessary-key": "error",
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
		"react/no-useless-fragment": "error",
		"react/prefer-destructuring-assignment": "error",
		"react/prefer-use-state-lazy-initialization": "error",

		// react-dom
		"react-dom/no-void-elements-with-children": "error",
		"react-dom/no-dangerously-set-innerhtml": "error",
		"react-dom/no-dangerously-set-innerhtml-with-children": "error",
		"react-dom/no-find-dom-node": "error",
		"react-dom/no-flush-sync": "error",
		"react-dom/no-missing-button-type": "error",
		"react-dom/no-missing-iframe-sandbox": "error",
		"react-dom/no-namespace": "error",
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

		// react-hooks-extra
		"react-hooks-extra/no-direct-set-state-in-use-effect": "error",

		// react-naming-convention
		"react-naming-convention/component-name": "error",
		"react-naming-convention/use-state": "error",
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
