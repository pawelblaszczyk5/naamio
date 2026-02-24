import { Schema } from "effect";
import { Entity } from "effect/unstable/cluster";
import { Rpc } from "effect/unstable/rpc";

import { AgentMessageModel } from "@naamio/schema/domain";

import {
	GenerationAlreadyInProgressError,
	MissingConversationError,
	MissingMessageError,
} from "#src/features/chat/errors.js";

export const ConversationGenerationManagerEntity = Entity.make("ConversationMessageGenerator", [
	Rpc.make("StartGeneration", {
		error: Schema.Union([GenerationAlreadyInProgressError, MissingMessageError, MissingConversationError]),
		payload: Schema.Struct({ messageId: AgentMessageModel.select.fields.id }),
	}),
	Rpc.make("InterruptGeneration", { payload: Schema.Struct({ messageId: AgentMessageModel.select.fields.id }) }),
	Rpc.make("Cleanup"),
]);
