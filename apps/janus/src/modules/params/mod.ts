import { notFound } from "@tanstack/react-router";
import { Option, Schema } from "effect";

type WidenParam<T> =
	T extends string ? string
	: T extends number ? number
	: T extends boolean ? boolean
	: T;

type WidenEncodedParams<T extends Record<string, unknown>> = { [Key in keyof T]: WidenParam<T[Key]> } & {};

export const paramsFromSchema = <Type extends Record<string, unknown>, Encoded extends Record<string, unknown>>(
	schema: Schema.Schema<Type, Encoded>,
) => {
	const decodeOption = Schema.decodeUnknownOption(schema);
	const encode = Schema.encodeSync(schema);

	return {
		parse: (rawParams: WidenEncodedParams<Encoded>) => {
			const maybeParsedParams = decodeOption(rawParams);

			if (Option.isNone(maybeParsedParams)) {
				throw notFound();
			}

			return maybeParsedParams.value;
		},
		stringify: (decoded: Type) => encode(decoded),
	};
};
