import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { Schema, String } from "effect";

import { PasskeyModel } from "@naamio/schema/domain";

const Passkey = Schema.Struct({
	aaguid: PasskeyModel.json.fields.aaguid,
	backedUp: PasskeyModel.json.fields.backedUp,
	createdAt: Schema.DateFromSelf,
	deviceType: PasskeyModel.json.fields.deviceType,
	displayName: PasskeyModel.json.fields.displayName,
	id: PasskeyModel.json.fields.id,
});

export type Passkey = (typeof Passkey)["Type"];

export const passkeyCollection = createCollection(
	electricCollectionOptions({
		getKey: (item) => item.id,
		schema: Schema.standardSchemaV1(Passkey),
		shapeOptions: {
			columnMapper: { decode: String.snakeToCamel, encode: String.camelToSnake },
			liveSse: true,
			parser: { timestamptz: (date: string) => new Date(date) },
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/passkey`,
		},
	}),
);

export const preloadPasskeyData = async () => passkeyCollection.preload();
