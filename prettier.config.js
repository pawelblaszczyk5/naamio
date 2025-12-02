/**
 * @type {import("prettier").Config}
 */
const prettierConfig = {
	printWidth: 120,
	useTabs: true,
	objectWrap: "collapse",
	experimentalOperatorPosition: "start",
	experimentalTernaries: true,
	plugins: ["prettier-plugin-embed", "prettier-plugin-sql"],
	overrides: [{ files: "*.svg", options: { parser: "html" } }],
};

/**
 * @type {import("prettier-plugin-embed").PluginEmbedOptions}
 */
const prettierPluginEmbedConfig = { embeddedSqlPlugin: "prettier-plugin-sql", embeddedSqlParser: "postgresql" };

/** @type {import('prettier-plugin-sql').SqlBaseOptions} */
const prettierPluginSqlConfig = {
	language: "postgresql",
	keywordCase: "upper",
	dataTypeCase: "upper",
	functionCase: "upper",
	identifierCase: "upper",
};

export default { ...prettierConfig, ...prettierPluginEmbedConfig, ...prettierPluginSqlConfig };
