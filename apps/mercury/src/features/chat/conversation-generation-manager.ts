import { Effect, Layer, Schema } from "effect";
import { Entity } from "effect/unstable/cluster";
import { Rpc } from "effect/unstable/rpc";

import { AgentMessageModel, ConversationModel } from "@naamio/schema/domain";

import { Conversation } from "#src/features/chat/conversation.js";
import {
	GenerationAlreadyInProgressError,
	MissingConversationError,
	MissingMessageError,
} from "#src/features/chat/errors.js";
import { ClusterRunnerLayer } from "#src/lib/cluster/mod.js";

export const ConversationGenerationManagerEntity = Entity.make("ConversationGenerationManager", [
	Rpc.make("StartGeneration", {
		error: Schema.Union([GenerationAlreadyInProgressError, MissingMessageError, MissingConversationError]),
		payload: Schema.Struct({ messageId: AgentMessageModel.select.fields.id }),
	}),
	Rpc.make("InterruptGeneration", { payload: Schema.Struct({ messageId: AgentMessageModel.select.fields.id }) }),
	Rpc.make("Cleanup"),
]);

export const ConversationGenerationManagerEntityLayer = ConversationGenerationManagerEntity.toLayer(
	Effect.gen(function* () {
		// @ts-expect-error -- this will be used in actual implementation
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- this will be used in actual implementation
		const conversation = yield* Conversation;

		// @ts-expect-error -- this will be used in actual implementation
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- this will be used in actual implementation
		const conversationId = yield* Entity.CurrentAddress.asEffect().pipe(
			Effect.map((entityAddress) => entityAddress.entityId),
			Effect.flatMap(Schema.decodeEffect(ConversationModel.select.fields.id)),
			Effect.catchTag(["SchemaError"], Effect.die),
		);

		return {
			Cleanup: Effect.fn("@naamio/mercury/ConversationGenerationManager#Cleanup")(function* () {
				yield* Effect.void;
			}),
			InterruptGeneration: Effect.fn("@naamio/mercury/ConversationGenerationManager#InterruptGeneration")(function* () {
				yield* Effect.void;
			}),
			StartGeneration: Effect.fn("@naamio/mercury/ConversationGenerationManager#StartGeneration")(function* () {
				yield* Effect.void;
			}),
		};
	}),
).pipe(Layer.provide([ClusterRunnerLayer, Conversation.layer]));
