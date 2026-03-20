import { createCollection, localOnlyCollectionOptions } from "@tanstack/react-db";
import { Schema } from "effect";

import { ConversationModel } from "@naamio/schema/domain";

import { AgentMessage } from "#src/features/chat/data/message.js";

export const ConversationState = Schema.Struct({
	activeLeafId: AgentMessage.fields.id,
	id: ConversationModel.json.fields.id,
});

export type ConversationState = Schema.Schema.Type<typeof ConversationState>;

export const conversationStateCollection = createCollection(
	localOnlyCollectionOptions({
		getKey: (conversationState) => conversationState.id,
		schema: Schema.toStandardSchemaV1(ConversationState),
	}),
);
