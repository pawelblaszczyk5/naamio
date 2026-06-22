const PREFIX = "Assertion failed";

// eslint-disable-next-line unicorn/consistent-function-style -- asserts function can't be arrow
export function assert(condition: any, message: (() => string) | string): asserts condition {
	if (condition) {
		return;
	}

	const provided = typeof message === "function" ? message() : message;

	throw new Error(`${PREFIX}: ${provided}`);
}
