import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { Schema, String } from "effect";

import { SessionModel } from "@naamio/schema/domain";

const Session = Schema.Struct({ expiresAt: Schema.DateFromSelf, id: SessionModel.json.fields.id });

export const sessionCollection = createCollection(
	electricCollectionOptions({
		getKey: (item) => item.id,
		schema: Schema.standardSchemaV1(Session),
		shapeOptions: {
			columnMapper: { decode: String.snakeToCamel, encode: String.camelToSnake },
			parser: { timestamptz: (date: string) => new Date(date) },
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/session`,
		},
	}),
);
