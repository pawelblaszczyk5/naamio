import { Option, Schema } from "effect";

// NOTE this is used for objects returned from 3rd party code that doesn't differentiate between optionality and nullability, that's a bit of a workaround
export const optionalWithExactOptionalPropertyKeysCompat = <A>(schema: Schema.Schema<A>) =>
	Schema.optionalToOptional(Schema.Union(Schema.Undefined, schema), schema, {
		decode: (option) => {
			if (Option.isNone(option)) {
				return Option.none();
			}

			const value = option.value;

			if (value === undefined) {
				return Option.none();
			}

			return Option.some(value);
		},
		encode: (option) => option,
	});
