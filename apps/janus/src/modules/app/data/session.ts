import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { Schema } from "effect";

import { SessionModel } from "@naamio/schema/domain";

const Session = Schema.Struct({ expires_at: Schema.DateFromSelf, id: SessionModel.json.fields.id });

export const sessionCollection = createCollection(
	electricCollectionOptions({
		getKey: (item) => item.id,
		schema: Schema.standardSchemaV1(Session),
		shapeOptions: {
			liveSse: true,
			parser: { timestamptz: (date: string) => new Date(date) },
			url: `${globalThis.location.origin}/api/shape/session`,
		},
	}),
);
