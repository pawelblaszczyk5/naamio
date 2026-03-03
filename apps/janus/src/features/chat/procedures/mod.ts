import { createServerFn } from "@tanstack/react-start";
import { Effect, flow, Option, Schema, Struct } from "effect";

import { VerifiedId } from "@naamio/id-generator/effect";
import { AgentMessageModel, ConversationModel, TextMessagePartModel, UserMessageModel } from "@naamio/schema/domain";

import { NaamioApiClient } from "#src/lib/api-client/mod.js";
import { sessionTokenMiddleware } from "#src/lib/effect-bridge/middleware.js";
import { runAuthenticatedOnlyServerFn } from "#src/lib/effect-bridge/mod.js";

const TextMessagePartInput = TextMessagePartModel.json.mapFields(
	flow(
		Struct.pick(["data", "id", "type"]),
		Struct.evolve({
			data: (schema) => schema.mapFields(Struct.evolve({ content: (schema) => schema.from.schema })),
			id: (schema) => VerifiedId.pipe(Schema.decodeTo(schema)),
		}),
	),
);

const UserMessagePartInput = Schema.Union([TextMessagePartInput]);

const RootUserMessageInput = UserMessageModel.json
	.mapFields(flow(Struct.pick(["id"]), Struct.evolve({ id: (schema) => VerifiedId.pipe(Schema.decodeTo(schema)) })))
	.pipe(Schema.fieldsAssign({ parts: Schema.NonEmptyArray(UserMessagePartInput) }));

const UserMessageInput = UserMessageModel.json
	.mapFields(
		flow(
			Struct.pick(["id", "parentId"]),
			Struct.evolve({
				id: (schema) => VerifiedId.pipe(Schema.decodeTo(schema)),
				parentId: (schema) => schema.from.schema,
			}),
		),
	)
	.pipe(Schema.fieldsAssign({ parts: Schema.NonEmptyArray(UserMessagePartInput) }));

const AgentMessageInput = AgentMessageModel.json.mapFields(
	flow(Struct.pick(["id"]), Struct.evolve({ id: (schema) => VerifiedId.pipe(Schema.decodeTo(schema)) })),
);

// @ts-expect-error -- it'll be used
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- it'll be used
const AgentMessageInputWithParentId = AgentMessageModel.json.mapFields(
	flow(Struct.pick(["id", "parentId"]), Struct.evolve({ id: (schema) => VerifiedId.pipe(Schema.decodeTo(schema)) })),
);

export const StartConversationPayload = Schema.Struct({
	conversationId: VerifiedId.pipe(Schema.decodeTo(ConversationModel.json.fields.id)),
	messages: Schema.Tuple([RootUserMessageInput, AgentMessageInput]),
});

export type StartConversationPayload = (typeof StartConversationPayload)["Type"];

export const startConversation = createServerFn({ method: "POST" })
	.inputValidator(Schema.toStandardSchemaV1(StartConversationPayload))
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const result = yield* naamioApiClient.Chat.startConversation({
				params: { conversationId: ctx.data.conversationId },
				payload: { messages: ctx.data.messages },
			});

			return result;
		}).pipe(Effect.withSpan("@naamio/janus/user/startConversation"), runAuthenticatedOnlyServerFn(ctx)),
	);

export const ContinueConversationPayload = Schema.Struct({
	conversationId: VerifiedId.pipe(Schema.decodeTo(ConversationModel.json.fields.id)),
	messages: Schema.Tuple([UserMessageInput, AgentMessageInput]),
});

export type ContinueConversationPayload = (typeof ContinueConversationPayload)["Type"];

export const continueConversation = createServerFn({ method: "POST" })
	.inputValidator(Schema.toStandardSchemaV1(ContinueConversationPayload))
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const userMessage = ctx.data.messages[0];
			const agentMessage = ctx.data.messages[1];

			const result = yield* naamioApiClient.Chat.continueConversation({
				params: { conversationId: ctx.data.conversationId },
				payload: {
					messages: [
						{ id: userMessage.id, parentId: Option.fromNullOr(userMessage.parentId), parts: userMessage.parts },
						{ id: agentMessage.id },
					],
				},
			});

			return result;
		}).pipe(Effect.withSpan("@naamio/janus/user/continueConversation"), runAuthenticatedOnlyServerFn(ctx)),
	);

export const InterruptGenerationPayload = Schema.Struct({
	conversationId: ConversationModel.json.fields.id,
	messageId: AgentMessageModel.json.fields.id,
});

export type InterruptGenerationPayload = (typeof InterruptGenerationPayload)["Type"];

export const interruptGeneration = createServerFn({ method: "POST" })
	.inputValidator(Schema.toStandardSchemaV1(InterruptGenerationPayload))
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const result = yield* naamioApiClient.Chat.interruptGeneration({
				params: { conversationId: ctx.data.conversationId, messageId: ctx.data.messageId },
			});

			return result;
		}).pipe(Effect.withSpan("@naamio/janus/user/interruptGeneration"), runAuthenticatedOnlyServerFn(ctx)),
	);

export const EditConversationTitlePayload = Schema.Struct({
	conversationId: ConversationModel.json.fields.id,
	title: ConversationModel.json.fields.title.from.schema.members[0],
});

export type EditConversationTitlePayload = (typeof EditConversationTitlePayload)["Type"];

export const editConversationTitle = createServerFn({ method: "POST" })
	.inputValidator(Schema.toStandardSchemaV1(EditConversationTitlePayload))
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const result = yield* naamioApiClient.Chat.editConversationTitle({
				params: { conversationId: ctx.data.conversationId },
				payload: { title: ctx.data.title },
			});

			return result;
		}).pipe(Effect.withSpan("@naamio/janus/user/editConversationTitle"), runAuthenticatedOnlyServerFn(ctx)),
	);

export const DeleteConversationPayload = Schema.Struct({ conversationId: ConversationModel.json.fields.id });

export type DeleteConversationPayload = (typeof DeleteConversationPayload)["Type"];

export const deleteConversation = createServerFn({ method: "POST" })
	.inputValidator(Schema.toStandardSchemaV1(DeleteConversationPayload))
	.middleware([sessionTokenMiddleware])
	.handler(async (ctx) =>
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			const result = yield* naamioApiClient.Chat.deleteConversation({
				params: { conversationId: ctx.data.conversationId },
			});

			return result;
		}).pipe(Effect.withSpan("@naamio/janus/user/deleteConversation"), runAuthenticatedOnlyServerFn(ctx)),
	);
