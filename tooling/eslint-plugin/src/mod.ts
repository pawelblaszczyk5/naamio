import type { RuleModule } from "@typescript-eslint/utils/ts-eslint";
import type { ESLint, Linter } from "eslint";

import { rules } from "#src/rules/mod.js";

type RuleKey = keyof typeof rules;

interface Plugin extends Omit<ESLint.Plugin, "rules"> {
	configs: { recommended: Linter.Config };
	rules: Record<RuleKey, RuleModule<string, []>>;
}

const plugin = { configs: {} as Plugin["configs"], rules } satisfies Plugin;

// eslint-disable-next-line fp/no-mutating-assign -- this way I can easily extend defined configs, without getting into circular references
Object.assign(plugin.configs, {
	recommended: { plugins: { naamio: plugin }, rules: { "naamio/enforce-stylex-call-as-last-prop": "error" as const } },
});

export default plugin;
