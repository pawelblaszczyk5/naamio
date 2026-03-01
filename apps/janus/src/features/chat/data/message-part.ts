import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { Schema, String, Struct } from "effect";

import { ReasoningMessagePartModel, TextMessagePartModel } from "@naamio/schema/domain";

const TextMessagePart = Schema.Struct({
	createdAt: Schema.Date,
	data: TextMessagePartModel.json.fields.data.mapFields(Struct.evolve({ content: (schema) => schema.from })),
	id: TextMessagePartModel.json.fields.id,
	messageId: TextMessagePartModel.json.fields.messageId,
	type: TextMessagePartModel.json.fields.type,
});

export type TextMessagePart = (typeof TextMessagePart)["Type"];

const ReasoningMessagePart = Schema.Struct({
	createdAt: Schema.Date,
	data: ReasoningMessagePartModel.json.fields.data.mapFields(Struct.evolve({ content: (schema) => schema.from })),
	id: ReasoningMessagePartModel.json.fields.id,
	messageId: ReasoningMessagePartModel.json.fields.messageId,
	type: ReasoningMessagePartModel.json.fields.type,
});

export type ReasoningMessagePart = (typeof ReasoningMessagePart)["Type"];

const MessagePart = Schema.Union([TextMessagePart, ReasoningMessagePart]);

export type MessagePart = (typeof MessagePart)["Type"];

export const messagePartCollection = createCollection(
	electricCollectionOptions({
		getKey: (item) => item.id,
		schema: Schema.toStandardSchemaV1(MessagePart),
		shapeOptions: {
			columnMapper: { decode: String.snakeToCamel, encode: String.camelToSnake },
			liveSse: true,
			parser: { timestamptz: (date: string) => new Date(date) },
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/message-part`,
		},
	}),
);

export const preloadMessagePartData = async () => messagePartCollection.preload();
