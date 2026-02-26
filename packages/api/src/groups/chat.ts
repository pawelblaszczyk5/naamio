import { flow, Schema, Struct } from "effect";
import { HttpApiEndpoint, HttpApiError, HttpApiGroup, OpenApi } from "effect/unstable/httpapi";

import { VerifiedId } from "@naamio/id-generator/effect";
import { ElectricProtocolQuery } from "@naamio/schema/api";
import { AgentMessageModel, ConversationModel, TextMessagePartModel, UserMessageModel } from "@naamio/schema/domain";

import { BadGateway, InsufficientStorage } from "#src/errors/mod.js";
import { AuthenticatedOnly } from "#src/middlewares/authenticated-only.js";

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
		flow(Struct.pick(["id", "parentId"]), Struct.evolve({ id: (schema) => VerifiedId.pipe(Schema.decodeTo(schema)) })),
	)
	.pipe(Schema.fieldsAssign({ parts: Schema.NonEmptyArray(UserMessagePartInput) }));

const AgentMessageInput = AgentMessageModel.json.mapFields(
	flow(Struct.pick(["id"]), Struct.evolve({ id: (schema) => VerifiedId.pipe(Schema.decodeTo(schema)) })),
);

const AgentMessageInputWithParentId = AgentMessageModel.json.mapFields(
	flow(Struct.pick(["id", "parentId"]), Struct.evolve({ id: (schema) => VerifiedId.pipe(Schema.decodeTo(schema)) })),
);

export class Chat extends HttpApiGroup.make("Chat")
	.add(
		HttpApiEndpoint.post("startConversation", "/conversation/:conversationId/start", {
			error: InsufficientStorage,
			params: { conversationId: VerifiedId.pipe(Schema.decodeTo(ConversationModel.json.fields.id)) },
			payload: Schema.Struct({ messages: Schema.Tuple([RootUserMessageInput, AgentMessageInput]) }),
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Start new chat conversation from the provided input. It involves creating conversation, messages and message parts from provided input. After doing so it fires background job to start LLM generation. It also involves generating conversation title in the background.",
				summary: "Start new conversation",
			}),
		),
	)
	.add(
		HttpApiEndpoint.post("continueConversation", "/conversation/:conversationId/continue", {
			error: [HttpApiError.NotFound, InsufficientStorage],
			params: { conversationId: ConversationModel.json.fields.id },
			payload: Schema.Struct({ messages: Schema.Tuple([UserMessageInput, AgentMessageInput]) }),
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Continue existing conversation with the provided input. After inserting messages and message parts from provided input it fires background job to start LLM generation. It may be used both for standard continuation but it may also be used for mimicking user message editing, which is basically continuing conversation from different leaf.",
				summary: "Continue existing conversation",
			}),
		),
	)
	.add(
		HttpApiEndpoint.post("regenerateAnswer", "/conversation/:conversationId/regenerate-answer", {
			error: [HttpApiError.NotFound, InsufficientStorage],
			params: { conversationId: ConversationModel.json.fields.id },
			payload: Schema.Struct({ message: AgentMessageInputWithParentId }),
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Regenerate answer for existing user message. After inserting agent message it fires background job to start LLM generation. It's used for cases where user want to retry message generation both due to error and answer dissatisfaction.",
				summary: "Regenerate answer in existing conversation",
			}),
		),
	)
	.add(
		HttpApiEndpoint.post("interruptGeneration", "/conversation/:conversationId/message/:messageId/interrupt", {
			error: [HttpApiError.NotFound, InsufficientStorage, HttpApiError.Conflict],
			params: { conversationId: ConversationModel.json.fields.id, messageId: AgentMessageModel.json.fields.id },
			payload: Schema.Struct({ messageId: AgentMessageModel.json.fields.id }),
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Interrupt ongoing LLM generation for given message ID. As mentioned in previous endpoints - each of them fires background job for LLM generation. Later on you can interrupt it if you don't care about answer anymore or don't want to incur additional costs.",
				summary: "Interrupt ongoing generation",
			}),
		),
	)
	.add(
		HttpApiEndpoint.delete("deleteConversation", "/conversation/:conversationId", {
			error: [HttpApiError.NotFound, InsufficientStorage],
			params: { conversationId: ConversationModel.json.fields.id },
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Allows to completely delete everything related to a single conversation including conversation itself, messages, message parts and even the inflight chunks. It also stops any ongoing generations for this conversation to prevent runaway jobs.",
				summary: "Delete existing conversation",
			}),
		),
	)
	.add(
		HttpApiEndpoint.patch("editConversationTitle", "/conversation/:conversationId/title", {
			error: HttpApiError.NotFound,
			params: { conversationId: ConversationModel.json.fields.id },
			payload: ConversationModel.jsonUpdate
				.mapFields(Struct.pick(["title"]))
				.mapFields(Struct.evolve({ title: (schema) => schema.from.schema.members[0] })),
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"By default the conversation title is generated in the background by LLM. It may lead to titles that doesn't reflect the best the purpose of conversation. This allows user to override generated title with whatever they like.",
				summary: "Edit existing conversation title",
			}),
		),
	)
	.add(
		HttpApiEndpoint.get("conversationShape", "/conversation/shape", {
			error: BadGateway,
			query: ElectricProtocolQuery,
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Electric shape that syncs data about all current user conversations. It uses the recommended Auth Proxy pattern from the Electric documentation and allows consuming shape through standard API-like endpoint, with built-in authentication, authorization and access control.",
				summary: "Electric conversation shape",
			}),
		),
	)
	.add(
		HttpApiEndpoint.get("messageShape", "/message/shape", {
			error: BadGateway,
			query: ElectricProtocolQuery,
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Electric shape that syncs data about all current user messages. It uses the recommended Auth Proxy pattern from the Electric documentation and allows consuming shape through standard API-like endpoint, with built-in authentication, authorization and access control.",
				summary: "Electric message shape",
			}),
		),
	)
	.add(
		HttpApiEndpoint.get("messagePartShape", "/message-part/shape", {
			error: BadGateway,
			query: ElectricProtocolQuery,
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Electric shape that syncs data about all current user message parts. It uses the recommended Auth Proxy pattern from the Electric documentation and allows consuming shape through standard API-like endpoint, with built-in authentication, authorization and access control.",
				summary: "Electric message part shape",
			}),
		),
	)
	.add(
		HttpApiEndpoint.get("inflightChunkShape", "/inflight-chunk/shape", {
			error: BadGateway,
			query: ElectricProtocolQuery,
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Electric shape that syncs data about all current user inflight chunks. It uses the recommended Auth Proxy pattern from the Electric documentation and allows consuming shape through standard API-like endpoint, with built-in authentication, authorization and access control.",
				summary: "Electric inflight chunk shape",
			}),
		),
	)
	.prefix("/chat")
	.middleware(AuthenticatedOnly)
	.annotateMerge(
		OpenApi.annotations({
			description:
				"Everything related to chat inside of the app. Starting new conversation, continuing existing ones, managing them. That's the core experience of user inside of the app",
		}),
	) {}
