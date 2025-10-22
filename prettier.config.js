/**
 * @type {import("prettier").Config}
 */
const prettierConfig = {
	printWidth: 120,
	useTabs: true,
	objectWrap: "collapse",
	experimentalOperatorPosition: "start",
	experimentalTernaries: true,
	overrides: [{ files: "*.svg", options: { parser: "html" } }],
};

export default { ...prettierConfig };
