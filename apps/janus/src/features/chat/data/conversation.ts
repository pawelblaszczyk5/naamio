import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { Schema, String } from "effect";

import { ConversationModel } from "@naamio/schema/domain";

export const Conversation = Schema.Struct({
	accessedAt: Schema.Date,
	createdAt: Schema.Date,
	id: ConversationModel.json.fields.id,
	title: ConversationModel.json.fields.title.from.schema,
	updatedAt: Schema.Date,
});

export type Conversation = Schema.Schema.Type<typeof Conversation>;

export const conversationCollection = createCollection(
	electricCollectionOptions({
		getKey: (item) => item.id,
		schema: Schema.toStandardSchemaV1(Conversation),
		shapeOptions: {
			columnMapper: { decode: String.snakeToCamel, encode: String.camelToSnake },
			liveSse: true,
			parser: { timestamptz: (date: string) => new Date(date) },
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/conversation`,
		},
	}),
);

export const preloadConversationData = async () => conversationCollection.preload();
