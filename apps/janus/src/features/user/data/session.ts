import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { Schema, String } from "effect";

import { SessionModel } from "@naamio/schema/domain";

export const Session = Schema.Struct({
	deviceLabel: Schema.NullOr(SessionModel.json.fields.deviceLabel.from),
	expiresAt: Schema.Date,
	id: SessionModel.json.fields.id,
	passkeyId: SessionModel.json.fields.passkeyId,
});

export type Session = Schema.Schema.Type<typeof Session>;

export const sessionCollection = createCollection(
	electricCollectionOptions({
		getKey: (item) => item.id,
		schema: Schema.toStandardSchemaV1(Session),
		shapeOptions: {
			columnMapper: { decode: String.snakeToCamel, encode: String.camelToSnake },
			liveSse: true,
			parser: { timestamptz: (date: string) => new Date(date) },
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/session`,
		},
	}),
);

export const preloadSessionData = async () => sessionCollection.preload();
