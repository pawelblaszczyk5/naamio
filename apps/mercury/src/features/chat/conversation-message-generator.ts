import { Entity } from "@effect/cluster";
import { Rpc } from "@effect/rpc";
import { Schema } from "effect";

import { AgentMessageModel } from "@naamio/schema/domain";

import {
	GenerationAlreadyInProgressError,
	MissingConversationError,
	MissingMessageError,
} from "#src/features/chat/errors.js";

export const ConversationMessageGenerator = Entity.make("ConversationMessageGenerator", [
	Rpc.make("startGeneration", {
		error: Schema.Union(GenerationAlreadyInProgressError, MissingMessageError, MissingConversationError),
		payload: Schema.Struct({ messageId: AgentMessageModel.select.fields.id }),
	}),
	Rpc.make("interruptGeneration", {
		error: Schema.Union(MissingMessageError, MissingConversationError),
		payload: Schema.Struct({ messageId: AgentMessageModel.select.fields.id }),
	}),
]);
