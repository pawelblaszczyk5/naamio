import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { Schema, String } from "effect";

import { InflightChunkModel } from "@naamio/schema/domain";

export const InflightChunk = Schema.Struct({
	content: InflightChunkModel.json.fields.content,
	id: InflightChunkModel.json.fields.id,
	messagePartId: InflightChunkModel.json.fields.messagePartId,
	sequence: InflightChunkModel.json.fields.sequence,
});

export type InflightChunk = (typeof InflightChunk)["Type"];

export const inflightChunkCollection = createCollection(
	electricCollectionOptions({
		getKey: (item) => item.id,
		schema: Schema.toStandardSchemaV1(InflightChunk),
		shapeOptions: {
			columnMapper: { decode: String.snakeToCamel, encode: String.camelToSnake },
			liveSse: true,
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/inflight-chunk`,
		},
	}),
);

export const preloadInflightChunkData = async () => inflightChunkCollection.preload();
