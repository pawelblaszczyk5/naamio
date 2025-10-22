import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import canonical from "eslint-plugin-canonical";
import preferArrowFunctions from "eslint-plugin-prefer-arrow-functions";
import fp from "eslint-plugin-fp";
import importX from "eslint-plugin-import-x";
import gitignore from "eslint-config-flat-gitignore";
import unicorn from "eslint-plugin-unicorn";
import perfectionist from "eslint-plugin-perfectionist";
import regexpPlugin from "eslint-plugin-regexp";
import { FlatCompat } from "@eslint/eslintrc";
import promise from "eslint-plugin-promise";
import noSecrets from "eslint-plugin-no-secrets";
import deMorgan from "eslint-plugin-de-morgan";
import { defineConfig } from "eslint/config";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const banExtension = (extension) => {
	const message = `Unexpected use of file extension (.${extension})`;
	const literalAttributeMatcher = `Literal[value=/\\.${extension}$/]`;
	return [
		{
			// import foo from 'bar.xxx';
			selector: `ImportDeclaration > ${literalAttributeMatcher}.source`,
			message,
		},
		{
			// export { foo } from 'bar.xxx';
			selector: `ExportNamedDeclaration > ${literalAttributeMatcher}.source`,
			message,
		},
		{
			// export * from 'bar.xxx';
			selector: `ExportAllDeclaration > ${literalAttributeMatcher}.source`,
			message,
		},
		{
			// const foo = import('bar.xxx');
			selector: `ImportExpression > ${literalAttributeMatcher}.source`,
			message,
		},
		{
			// type Foo = typeof import('bar.xxx');
			selector: `TSImportType > TSLiteralType > ${literalAttributeMatcher}`,
			message,
		},
		{
			// const foo = require('foo.xxx');
			selector: `CallExpression[callee.name = "require"] > ${literalAttributeMatcher}.arguments`,
			message,
		},
	];
};

export default defineConfig({
	files: ["**/*.{ts,tsx,js,jsx}"],
	name: "naamio/core",
	linterOptions: { reportUnusedDisableDirectives: "error", reportUnusedInlineConfigs: "error" },
	ignores: ["eslint.config.js"],
	plugins: {
		canonical,
		"prefer-arrow-functions": preferArrowFunctions,
		fp,
		"import-x": importX,
		"no-secrets": noSecrets,
	},
	settings: { "import-x/extensions": [".ts", ".tsx", ".js"], "import-x/resolver": { typescript: true, node: true } },
	extends: [
		gitignore(),
		eslint.configs.recommended,
		tseslint.configs.strictTypeChecked,
		tseslint.configs.stylisticTypeChecked,
		compat.extends("plugin:eslint-comments/recommended"),
		unicorn.configs["recommended"],
		perfectionist.configs["recommended-natural"],
		regexpPlugin.configs["flat/recommended"],
		promise.configs["flat/recommended"],
		deMorgan.configs.recommended,
	],
	rules: {
		// builtin overrides
		"arrow-body-style": ["error", "as-needed"],
		curly: ["error", "all"],
		"default-case-last": "error",
		eqeqeq: "error",
		"linebreak-style": ["error", "unix"],
		"logical-assignment-operators": ["error", "always", { enforceForIfStatements: true }],
		"no-alert": "error",
		"no-console": "error",
		"no-div-regex": "error",
		"no-else-return": ["error", { allowElseIf: false }],
		"no-eval": "error",
		"no-extend-native": "error",
		"no-floating-decimal": "error",
		"no-implicit-coercion": "error",
		"no-mixed-spaces-and-tabs": "off",
		"no-param-reassign": "error",
		"no-plusplus": "error",
		"no-promise-executor-return": "error",
		"no-regex-spaces": "error",
		"no-restricted-syntax": [
			"error",
			{
				message: "Use #private instead of TS accessibility modifier",
				selector: ':matches(PropertyDefinition, MethodDefinition)[accessibility="private"]',
			},
			...banExtension("ts"),
			...banExtension("tsx"),
		],
		"no-return-assign": "error",
		"no-self-compare": "error",
		"no-sequences": "error",
		"no-template-curly-in-string": "error",
		"no-undef": "off",
		"no-undef-init": "error",
		"no-underscore-dangle": ["error", { allow: ["_tag"] }],
		"no-unneeded-ternary": "error",
		"no-useless-call": "error",
		"no-useless-computed-key": "error",
		"no-useless-concat": "error",
		"no-var": "error",
		"object-shorthand": ["error", "always"],
		"one-var": ["error", "never"],
		"one-var-declaration-per-line": "error",
		"operator-assignment": ["error", "always"],
		"padding-line-between-statements": [
			"error",
			{ blankLine: "always", next: "*", prev: ["const", "let", "var"] },
			{ blankLine: "any", next: ["const", "let", "var"], prev: ["const", "let", "var"] },
		],
		"prefer-const": "error",
		"prefer-exponentiation-operator": "error",
		"prefer-object-has-own": "error",
		"prefer-object-spread": "error",
		"prefer-promise-reject-errors": "error",
		"prefer-regex-literals": ["error", { disallowRedundantWrapping: true }],
		"prefer-rest-params": "error",
		"prefer-spread": "error",
		"prefer-template": "error",
		"preserve-caught-error": ["error", { requireCatchParameter: true }],
		"quote-props": ["error", "as-needed", { numbers: true }],
		radix: "error",
		"require-atomic-updates": "error",
		"require-unicode-regexp": "error",
		"require-yield": "off",
		"spaced-comment": ["error", "always"],
		"symbol-description": "error",
		yoda: ["error", "never"],

		// typescript-eslint overrides
		"@typescript-eslint/array-type": ["error", { default: "generic", readonly: "generic" }],
		"@typescript-eslint/consistent-type-definitions": ["error", "interface"],
		"@typescript-eslint/consistent-type-exports": ["error", { fixMixedExportsWithInlineTypeSpecifier: true }],
		"@typescript-eslint/consistent-type-imports": [
			"error",
			{ disallowTypeAnnotations: false, fixStyle: "separate-type-imports", prefer: "type-imports" },
		],
		"@typescript-eslint/default-param-last": "error",
		"@typescript-eslint/method-signature-style": ["error", "property"],
		"@typescript-eslint/no-empty-object-type": ["error", { allowInterfaces: "with-single-extends" }],
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
		"@typescript-eslint/no-restricted-imports": [
			"error",
			{ patterns: [{ regex: "^\\.", message: "Don't use relative imports" }] },
		],
		"@typescript-eslint/no-unnecessary-type-parameters": "error",
		"@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
		"@typescript-eslint/no-use-before-define": [
			"error",
			{
				allowNamedExports: false,
				classes: true,
				enums: true,
				functions: true,
				ignoreTypeReferences: false,
				typedefs: true,
				variables: true,
			},
		],
		"@typescript-eslint/no-useless-empty-export": "error",
		"@typescript-eslint/promise-function-async": "error",
		"@typescript-eslint/restrict-template-expressions": "error",

		// canonical
		"canonical/filename-no-index": "error",

		// eslint-comments overrides
		"eslint-comments/disable-enable-pair": "error",
		"eslint-comments/no-unused-disable": "error",
		"eslint-comments/require-description": "error",

		// prefer-arrow-functions
		"prefer-arrow-functions/prefer-arrow-functions": [
			"error",
			{ classPropertiesAllowed: true, disallowPrototype: true, returnStyle: "unchanged", singleReturnOnly: false },
		],

		// fp
		"fp/no-arguments": "error",
		"fp/no-delete": "error",
		"fp/no-loops": "error",
		"fp/no-mutating-assign": "error",
		"fp/no-valueof-field": "error",

		// import-x
		"import-x/consistent-type-specifier-style": ["error", "prefer-top-level"],
		"import-x/export": "error",
		"import-x/first": "error",
		"import-x/newline-after-import": "error",
		"import-x/no-cycle": "error",
		"import-x/no-duplicates": "error",
		"import-x/no-extraneous-dependencies": "error",
		"import-x/no-mutable-exports": "error",
		"import-x/no-named-as-default": "error",
		"import-x/no-named-as-default-member": "error",
		"import-x/no-default-export": "error",

		// unicorn overrides
		"unicorn/expiring-todo-comments": ["error", { allowWarningComments: false, terms: ["TODO", "FIXME"] }],
		"unicorn/import-style": ["error", { extendDefaultStyles: false }],
		"unicorn/no-array-for-each": "off",
		"unicorn/no-array-reduce": "off",
		"unicorn/no-null": "off",
		"unicorn/no-useless-undefined": "off",
		"unicorn/numeric-separators-style": [
			"error",
			{
				binary: { groupLength: 4, minimumDigits: 0 },
				hexadecimal: { groupLength: 2, minimumDigits: 0 },
				number: { groupLength: 3, minimumDigits: 4 },
				octal: { groupLength: 4, minimumDigits: 0 },
				onlyIfContainsSeparator: false,
			},
		],
		"unicorn/prevent-abbreviations": [
			"error",
			{
				allowList: {
					args: true,
					ctx: true,
					rel: true,
					fn: true,
					Fn: true,
					Params: true,
					params: true,
					mod: true,
					Dev: true,
					dev: true,
					props: true,
					Props: true,
					src: true,
					ref: true,
					Ref: true,
				},
				checkProperties: true,
				checkShorthandProperties: true,
			},
		],
		"unicorn/require-post-message-target-origin": "error",
		"unicorn/no-unused-properties": "error",
		"unicorn/throw-new-error": "off",
		"unicorn/no-array-callback-reference": "off",
		"unicorn/no-array-method-this-argument": "off",
		"unicorn/prefer-native-coercion-functions": "off",
		"unicorn/prefer-array-flat": "off",
		"unicorn/number-literal-case": "off",

		// perfectionist overrides
		"perfectionist/sort-modules": "off",
		"perfectionist/sort-imports": [
			"error",
			{
				groups: [
					["builtin-type", "type"],
					["builtin", "external"],
					"monorepo-type",
					"monorepo",
					"internal-type",
					"internal",
					["parent-type", "sibling-type", "index-type"],
					["parent", "sibling", "index"],
					"side-effect",
					"style",
					"object",
					"unknown",
				],
				internalPattern: ["#.*"],
				order: "asc",
				type: "natural",
				customGroups: { value: { monorepo: ["@naamio/.*"] }, type: { "monorepo-type": ["@naamio/.*"] } },
			},
		],
		"perfectionist/sort-jsx-props": [
			"error",
			{ groups: ["multiline", "unknown", "shorthand"], order: "asc", type: "natural" },
		],

		// no-secrets
		"no-secrets/no-secrets": ["error", { tolerance: 4.25 }],
	},
});
