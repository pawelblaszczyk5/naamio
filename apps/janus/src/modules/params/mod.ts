import { notFound } from "@tanstack/react-router";
import { Option, Schema } from "effect";

export const paramsFromSchema = <Type extends Record<string, unknown>, Encoded>(
	schema: Schema.Schema<Type, Encoded>,
) => {
	const decodeOption = Schema.decodeUnknownOption(schema);
	const encode = Schema.encodeSync(schema);

	return {
		parse: (rawParams: unknown) => {
			const maybeParsedParams = decodeOption(rawParams);

			if (Option.isNone(maybeParsedParams)) {
				throw notFound();
			}

			return maybeParsedParams.value;
		},
		stringify: (decoded: Type) => encode(decoded),
	};
};
