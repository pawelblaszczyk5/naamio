import { Array, Effect, Fiber, HashMap, Layer, Option, Ref, Schema } from "effect";
import { Entity } from "effect/unstable/cluster";
import { Rpc } from "effect/unstable/rpc";
import { WorkflowEngine } from "effect/unstable/workflow";

import { AgentMessageModel, ConversationModel } from "@naamio/schema/domain";

import {
	Conversation,
	InflightChunkCleanupWorkflow,
	InflightChunkCleanupWorkflowLayer,
} from "#src/features/chat/conversation.js";
import {
	GenerationAlreadyInProgressError,
	MissingConversationError,
	MissingMessageError,
} from "#src/features/chat/errors.js";
import { ClusterRunnerLayer, WorkflowEngineLayer } from "#src/lib/cluster/mod.js";

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
		const conversation = yield* Conversation;
		const workflowEngine = yield* WorkflowEngine.WorkflowEngine;

		const scope = yield* Effect.scope;

		const ongoingGenerations = HashMap.empty<AgentMessageModel["id"], Fiber.Fiber<unknown, unknown>>();
		const isCleanedUpRef = yield* Ref.make(false);

		const conversationId = yield* Entity.CurrentAddress.asEffect().pipe(
			Effect.map((entityAddress) => entityAddress.entityId),
			Effect.flatMap(Schema.decodeEffect(ConversationModel.select.fields.id)),
			Effect.catchTag(["SchemaError"], Effect.die),
		);

		return {
			Cleanup: Effect.fn("@naamio/mercury/ConversationGenerationManager#Cleanup")(function* () {
				yield* Ref.set(isCleanedUpRef, true);

				yield* Effect.forEach(HashMap.toValues(ongoingGenerations), Fiber.interrupt);
			}),
			InterruptGeneration: Effect.fn("@naamio/mercury/ConversationGenerationManager#InterruptGeneration")(
				function* (envelope) {
					const maybeFiber = HashMap.get(ongoingGenerations, envelope.payload.messageId);

					if (Option.isNone(maybeFiber)) {
						return;
					}

					yield* Fiber.interrupt(maybeFiber.value);
				},
			),
			StartGeneration: Effect.fn("@naamio/mercury/ConversationGenerationManager#StartGeneration")(function* (envelope) {
				const isCleanedUp = yield* Ref.get(isCleanedUpRef);

				if (isCleanedUp) {
					// NOTE not yet sure if it's safe to just early exit on that case
					return;
				}

				const maybeConversationForGeneration = yield* conversation.system.findConversationForGeneration(conversationId);

				if (Option.isNone(maybeConversationForGeneration)) {
					return yield* new MissingConversationError();
				}

				const maybeMessageToGenerateFrom = Array.findFirst(
					maybeConversationForGeneration.value.messages,
					(message) => message.id === envelope.payload.messageId,
				);

				if (
					Option.isNone(maybeMessageToGenerateFrom)
					|| maybeMessageToGenerateFrom.value.role === "USER"
					|| maybeMessageToGenerateFrom.value.status !== "IN_PROGRESS"
				) {
					return yield* new MissingMessageError();
				}

				const inProgressGeneration = HashMap.get(ongoingGenerations, envelope.payload.messageId);

				if (Option.isSome(inProgressGeneration)) {
					return yield* new GenerationAlreadyInProgressError();
				}

				const fiber = yield* Effect.gen(function* () {
					yield* Effect.sleep("5 seconds");

					const reasoningMessagePart = yield* conversation.system.insertReasoningMessagePart({
						data: { content: Option.none() },
						messageId: envelope.payload.messageId,
						userId: maybeConversationForGeneration.value.userId,
					});

					yield* conversation.system.insertInflightChunk({
						content: "Lorem",
						messagePartId: reasoningMessagePart.id,
						sequence: 1,
						userId: maybeConversationForGeneration.value.userId,
					});

					yield* Effect.sleep("1 seconds");

					yield* conversation.system.insertInflightChunk({
						content: "Ipsum",
						messagePartId: reasoningMessagePart.id,
						sequence: 2,
						userId: maybeConversationForGeneration.value.userId,
					});

					yield* Effect.sleep("1 seconds");

					yield* conversation.system.insertInflightChunk({
						content: "Dolores",
						messagePartId: reasoningMessagePart.id,
						sequence: 3,
						userId: maybeConversationForGeneration.value.userId,
					});

					yield* Effect.sleep("1 seconds");

					yield* conversation.system.insertInflightChunk({
						content: "Sum",
						messagePartId: reasoningMessagePart.id,
						sequence: 4,
						userId: maybeConversationForGeneration.value.userId,
					});

					yield* conversation.system.materializeReasoningMessagePart(reasoningMessagePart.id);

					yield* InflightChunkCleanupWorkflow.execute(
						{ messagePartId: reasoningMessagePart.id },
						{ discard: true },
					).pipe(Effect.provideService(WorkflowEngine.WorkflowEngine, workflowEngine));

					yield* Effect.sleep("4 seconds");

					const textMessagePart = yield* conversation.system.insertTextMessagePart({
						data: { content: Option.none() },
						messageId: envelope.payload.messageId,
						userId: maybeConversationForGeneration.value.userId,
					});

					yield* conversation.system.insertInflightChunk({
						content: "Consectetur",
						messagePartId: textMessagePart.id,
						sequence: 1,
						userId: maybeConversationForGeneration.value.userId,
					});

					yield* Effect.sleep("1 seconds");

					yield* conversation.system.insertInflightChunk({
						content: "adipiscing",
						messagePartId: textMessagePart.id,
						sequence: 2,
						userId: maybeConversationForGeneration.value.userId,
					});

					yield* Effect.sleep("1 seconds");

					yield* conversation.system.insertInflightChunk({
						content: "elit",
						messagePartId: textMessagePart.id,
						sequence: 3,
						userId: maybeConversationForGeneration.value.userId,
					});

					yield* Effect.sleep("1 seconds");

					yield* conversation.system.insertInflightChunk({
						content: "quam",
						messagePartId: textMessagePart.id,
						sequence: 4,
						userId: maybeConversationForGeneration.value.userId,
					});

					yield* conversation.system.materializeTextMessagePart(textMessagePart.id);

					yield* InflightChunkCleanupWorkflow.execute({ messagePartId: textMessagePart.id }, { discard: true }).pipe(
						Effect.provideService(WorkflowEngine.WorkflowEngine, workflowEngine),
					);

					yield* conversation.system.transitionMessageToFinished({
						id: envelope.payload.messageId,
						metadata: {
							performanceMetrics: { processingTime: 12, timeToFirstToken: 2 },
							usage: { cachedInputTokens: 2, inputTokens: 14, outputTokens: 10, totalTokens: 24 },
						},
						userId: maybeConversationForGeneration.value.userId,
					});
				}).pipe(Effect.withSpan("@naamio/mercury/ConversationGenerationManager#Generation"), Effect.forkIn(scope));

				HashMap.set(ongoingGenerations, envelope.payload.messageId, fiber);
			}),
		};
	}),
).pipe(Layer.provide([ClusterRunnerLayer, WorkflowEngineLayer, InflightChunkCleanupWorkflowLayer, Conversation.layer]));
