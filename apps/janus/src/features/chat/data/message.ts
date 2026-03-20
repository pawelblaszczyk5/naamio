import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { Schema, String } from "effect";

import { AgentMessageModel, UserMessageModel } from "@naamio/schema/domain";

export const AgentMessage = Schema.Struct({
	conversationId: AgentMessageModel.json.fields.conversationId,
	createdAt: Schema.Date,
	id: AgentMessageModel.json.fields.id,
	metadata: AgentMessageModel.json.fields.metadata.from.schema,
	parentId: AgentMessageModel.json.fields.parentId,
	role: AgentMessageModel.json.fields.role,
	status: AgentMessageModel.json.fields.status,
});

export type AgentMessage = Schema.Schema.Type<typeof AgentMessage>;

export const UserMessage = Schema.Struct({
	conversationId: UserMessageModel.json.fields.conversationId,
	createdAt: Schema.Date,
	id: UserMessageModel.json.fields.id,
	parentId: UserMessageModel.json.fields.parentId.from.schema,
	role: UserMessageModel.json.fields.role,
});

export type UserMessage = Schema.Schema.Type<typeof UserMessage>;

export const Message = Schema.Union([AgentMessage, UserMessage]);

export type Message = Schema.Schema.Type<typeof Message>;

export const messageCollection = createCollection(
	electricCollectionOptions({
		getKey: (item) => item.id,
		schema: Schema.toStandardSchemaV1(Message),
		shapeOptions: {
			columnMapper: { decode: String.snakeToCamel, encode: String.camelToSnake },
			liveSse: true,
			parser: { timestamptz: (date: string) => new Date(date) },
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/message`,
		},
	}),
);

export const preloadMessageData = async () => messageCollection.preload();
