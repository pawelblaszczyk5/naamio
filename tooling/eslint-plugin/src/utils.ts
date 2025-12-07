import { ESLintUtils } from "@typescript-eslint/utils";

export interface NaamioEslintPluginRuleDocs {
	description: string;
	recommended: boolean;
	requiresTypeChecking: boolean;
}

export const createRule = ESLintUtils.RuleCreator<NaamioEslintPluginRuleDocs>(
	(name) => `https://github.com/pawelblaszczyk5/naamio/tree/main/tooling/eslint-plugin/src/rules/${name}.ts`,
);
