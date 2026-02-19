import { Schema } from "effect";
import { Entity } from "effect/unstable/cluster";
import { Rpc } from "effect/unstable/rpc";

import { AgentMessageModel } from "@naamio/schema/domain";

import {
	GenerationAlreadyInProgressError,
	MissingConversationError,
	MissingMessageError,
} from "#src/features/chat/errors.js";

export const ConversationMessageGenerator = Entity.make("ConversationMessageGenerator", [
	Rpc.make("startGeneration", {
		error: Schema.Union([GenerationAlreadyInProgressError, MissingMessageError, MissingConversationError]),
		payload: Schema.Struct({ messageId: AgentMessageModel.select.fields.id }),
	}),
	Rpc.make("interruptGeneration", {
		error: Schema.Union([MissingMessageError, MissingConversationError]),
		payload: Schema.Struct({ messageId: AgentMessageModel.select.fields.id }),
	}),
]);
