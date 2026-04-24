import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { BasicIndex, BTreeIndex, createCollection, localOnlyCollectionOptions } from "@tanstack/react-db";
import { Schema, String, Struct } from "effect";

import {
	AgentMessageModel,
	ConversationModel,
	InflightChunkModel,
	ReasoningMessagePartModel,
	TextMessagePartModel,
	UserMessageModel,
} from "@naamio/schema/domain";

export const Conversation = Schema.Struct({
	accessedAt: Schema.Date,
	createdAt: Schema.Date,
	id: ConversationModel.json.fields.id,
	title: ConversationModel.json.fields.title.from.schema,
	updatedAt: Schema.Date,
});
export type Conversation = Schema.Schema.Type<typeof Conversation>;

export const conversationsCollection = createCollection(
	electricCollectionOptions({
		autoIndex: "eager",
		defaultIndexType: BTreeIndex,
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

export const messagesCollection = createCollection(
	electricCollectionOptions({
		autoIndex: "eager",
		defaultIndexType: BTreeIndex,
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

export const TextMessagePart = Schema.Struct({
	createdAt: Schema.Date,
	data: TextMessagePartModel.json.fields.data.mapFields(Struct.evolve({ content: (schema) => schema.from })),
	id: TextMessagePartModel.json.fields.id,
	messageId: TextMessagePartModel.json.fields.messageId,
	type: TextMessagePartModel.json.fields.type,
});
export type TextMessagePart = Schema.Schema.Type<typeof TextMessagePart>;

export const ReasoningMessagePart = Schema.Struct({
	createdAt: Schema.Date,
	data: ReasoningMessagePartModel.json.fields.data.mapFields(Struct.evolve({ content: (schema) => schema.from })),
	id: ReasoningMessagePartModel.json.fields.id,
	messageId: ReasoningMessagePartModel.json.fields.messageId,
	type: ReasoningMessagePartModel.json.fields.type,
});
export type ReasoningMessagePart = Schema.Schema.Type<typeof ReasoningMessagePart>;

export const MessagePart = Schema.Union([TextMessagePart, ReasoningMessagePart]);
export type MessagePart = Schema.Schema.Type<typeof MessagePart>;

export const messagePartsCollection = createCollection(
	electricCollectionOptions({
		autoIndex: "eager",
		defaultIndexType: BTreeIndex,
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

export const InflightChunk = Schema.Struct({
	content: InflightChunkModel.json.fields.content,
	id: InflightChunkModel.json.fields.id,
	messagePartId: InflightChunkModel.json.fields.messagePartId,
	sequence: InflightChunkModel.json.fields.sequence,
});
export type InflightChunk = Schema.Schema.Type<typeof InflightChunk>;

export const inflightChunksCollection = createCollection(
	electricCollectionOptions({
		autoIndex: "eager",
		defaultIndexType: BTreeIndex,
		getKey: (item) => item.id,
		schema: Schema.toStandardSchemaV1(InflightChunk),
		shapeOptions: {
			columnMapper: { decode: String.snakeToCamel, encode: String.camelToSnake },
			liveSse: true,
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/inflight-chunk`,
		},
	}),
);

export const ConversationState = Schema.Struct({
	activeLeafId: AgentMessage.fields.id,
	id: ConversationModel.json.fields.id,
});
export type ConversationState = Schema.Schema.Type<typeof ConversationState>;

export const conversationsStateCollection = createCollection(
	localOnlyCollectionOptions({
		autoIndex: "eager",
		defaultIndexType: BasicIndex,
		getKey: (conversationState) => conversationState.id,
		schema: Schema.toStandardSchemaV1(ConversationState),
	}),
);
