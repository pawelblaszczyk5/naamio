import { Option, Redacted, Schema, SchemaGetter } from "effect";

// NOTE this is used for objects returned from 3rd party code that doesn't differentiate between optionality and nullability, that's a bit of a workaround
export const optionalWithExactOptionalPropertyKeysCompat = <T extends Schema.Top>(schema: T) =>
	Schema.optional(schema).pipe(
		Schema.decodeTo(Schema.optionalKey(schema), {
			decode: SchemaGetter.transformOptional(Option.filter((value) => value !== undefined)),
			encode: SchemaGetter.passthrough(),
		}),
	);

export const ArrayFromString = (separator?: string) =>
	Schema.String.pipe(
		Schema.decodeTo(Schema.Array(Schema.String), {
			decode: SchemaGetter.split({ separator }),
			encode: SchemaGetter.transform((value) => value.join(separator)),
		}),
	);

export const unsafeEncodableRedactedFromValue = <T extends Schema.Top>(
	schema: T,
	options?: { readonly label?: string | undefined },
) =>
	Schema.redact(schema).pipe(
		Schema.decodeTo(Schema.Redacted(schema, options), {
			decode: SchemaGetter.transform((value) => Redacted.make(value, options)),
			encode: SchemaGetter.transform((value) => Redacted.value(value)),
		}),
	);
