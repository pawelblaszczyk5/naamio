import { PgClient } from "@effect/sql-pg";
import {
	Array,
	DateTime,
	Duration,
	Effect,
	Layer,
	Match,
	Option,
	Order,
	pipe,
	Schema,
	ServiceMap,
	Struct,
} from "effect";
import { Model } from "effect/unstable/schema";
import { SqlSchema } from "effect/unstable/sql";
import { DurableClock, Workflow } from "effect/unstable/workflow";

import type { TransactionId } from "@naamio/schema/domain";

import { CurrentSession } from "@naamio/api/middlewares/authenticated-only";
import { generateId } from "@naamio/id-generator/effect";
import {
	AgentMessageModel,
	ConversationModel,
	InflightChunkModel,
	MessagePartType,
	MessageRole,
	MessageStatus,
	ReasoningMessagePartModel,
	TextMessagePartModel,
	UserMessageModel,
} from "@naamio/schema/domain";

import type {
	AgentMessageForGeneration,
	ContinueConversationInput,
	ConversationForGeneration,
	EditConversationTitleInput,
	InterruptGenerationInput,
	RegenerateAnswerInput,
	StartConversationInput,
	UserMessageForGeneration,
	UserMessagePartInput,
} from "#src/features/chat/types.js";

import {
	MessageAlreadyTransitionedError,
	MessagePartMaterializationError,
	MissingConversationError,
	MissingMessageError,
} from "#src/features/chat/errors.js";
import { WorkflowEngineLayer } from "#src/lib/cluster/mod.js";
import { DatabaseLayer } from "#src/lib/database/mod.js";
import { createGetTransactionId } from "#src/lib/database/utilities.js";

export class Conversation extends ServiceMap.Service<
	Conversation,
	{
		readonly system: {
			readonly deleteInflightChunks: (messagePartId: InflightChunkModel["messagePartId"]) => Effect.Effect<void>;
			readonly findConversationForGeneration: (
				id: ConversationModel["id"],
			) => Effect.Effect<Option.Option<ConversationForGeneration>>;
			readonly insertInflightChunk: (
				inflightChunk: Pick<InflightChunkModel, "content" | "messagePartId" | "sequence" | "userId">,
			) => Effect.Effect<void>;
			readonly insertReasoningMessagePart: (
				part: Pick<ReasoningMessagePartModel, "data" | "messageId" | "userId">,
			) => Effect.Effect<void>;
			readonly insertTextMessagePart: (
				part: Pick<TextMessagePartModel, "data" | "messageId" | "userId">,
			) => Effect.Effect<Pick<TextMessagePartModel, "id">>;
			readonly materializeReasoningMessagePart: (
				id: ReasoningMessagePartModel["id"],
			) => Effect.Effect<void, MessagePartMaterializationError>;
			readonly materializeTextMessagePart: (
				id: TextMessagePartModel["id"],
			) => Effect.Effect<void, MessagePartMaterializationError>;
			readonly transitionMessageToError: (
				message: Pick<AgentMessageModel, "id" | "userId">,
			) => Effect.Effect<void, MessageAlreadyTransitionedError | MissingMessageError>;
			readonly transitionMessageToFinished: (
				message: Pick<AgentMessageModel, "id" | "userId"> & {
					metadata: Option.Option.Value<AgentMessageModel["metadata"]>;
				},
			) => Effect.Effect<void, MessageAlreadyTransitionedError | MissingMessageError>;
		};
		readonly viewer: {
			readonly createConversation: (
				input: StartConversationInput,
			) => Effect.Effect<{ transactionId: TransactionId }, never, CurrentSession>;
			readonly deleteConversation: (
				id: ConversationModel["id"],
			) => Effect.Effect<{ transactionId: TransactionId }, MissingConversationError, CurrentSession>;
			readonly editConversationTitle: (
				input: EditConversationTitleInput,
			) => Effect.Effect<{ transactionId: TransactionId }, MissingConversationError, CurrentSession>;
			readonly updateConversationWithContinuation: (
				input: ContinueConversationInput,
			) => Effect.Effect<{ transactionId: TransactionId }, MissingConversationError, CurrentSession>;
			readonly updateConversationWithRegeneration: (
				input: RegenerateAnswerInput,
			) => Effect.Effect<{ transactionId: TransactionId }, MissingConversationError, CurrentSession>;
			readonly updateMessageWithInterruption: (
				input: InterruptGenerationInput,
			) => Effect.Effect<
				{ transactionId: TransactionId },
				MessageAlreadyTransitionedError | MissingConversationError | MissingMessageError,
				CurrentSession
			>;
			readonly verifyConversationExistence: (
				id: ConversationModel["id"],
			) => Effect.Effect<void, MissingConversationError, CurrentSession>;
		};
	}
>()("@naamio/mercury/Conversation") {
	static layer = Layer.effect(
		this,
		Effect.gen(function* () {
			const sql = yield* PgClient.PgClient;

			const getTransactionId = yield* createGetTransactionId();

			const insertConversation = SqlSchema.void({
				execute: (request) => sql`
					INSERT INTO
						${sql("conversation")} ${sql.insert(request)};
				`,
				Request: ConversationModel.insert,
			});

			const insertMessages = SqlSchema.void({
				execute: (request) => sql`
					INSERT INTO
						${sql("message")} ${sql.insert(request)};
				`,
				Request: Schema.NonEmptyArray(Model.Union([AgentMessageModel, UserMessageModel]).insert),
			});

			const insertMessageParts = SqlSchema.void({
				execute: (request) => sql`
					INSERT INTO
						${sql("messagePart")} ${sql.insert(
							request.map((messagePart) => ({ ...messagePart, data: sql.json(messagePart.data) })),
						)};
				`,
				Request: Schema.NonEmptyArray(Model.Union([TextMessagePartModel, ReasoningMessagePartModel]).insert),
			});

			const insertInflightChunk = SqlSchema.void({
				execute: (request) => sql`
					INSERT INTO
						${sql("inflightChunk")} ${sql.insert(request)};
				`,
				Request: InflightChunkModel.insert,
			});

			const updateConversationUpdatedAt = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("conversation")}
					SET
						${sql.update(request, ["id", "userId"])}
					WHERE
						${sql.and([sql`${sql("id")} = ${request.id}`, sql`${sql("userId")} = ${request.userId}`])};
				`,
				Request: ConversationModel.update.mapFields(Struct.pick(["updatedAt", "id", "userId"])),
			});

			const updateConversationTitle = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("conversation")}
					SET
						${sql.update(request, ["id", "userId"])}
					WHERE
						${sql.and([sql`${sql("id")} = ${request.id}`, sql`${sql("userId")} = ${request.userId}`])};
				`,
				Request: ConversationModel.update.mapFields(Struct.pick(["updatedAt", "id", "userId", "title"])),
			});

			const updateAgentMessageStatus = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("message")}
					SET
						${sql.update(request, ["id", "userId"])}
					WHERE
						${sql.and([
							sql`${sql("id")} = ${request.id}`,
							sql`${sql("userId")} = ${request.userId}`,
							sql`${sql("role")} = ${MessageRole.enums.AGENT}`,
							sql`${sql("status")} = ${MessageStatus.enums.IN_PROGRESS}`,
						])}
				`,
				Request: AgentMessageModel.update.mapFields(Struct.pick(["id", "userId", "status"])),
			});

			const updateAgentMessageStatusWithMetadata = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("message")}
					SET
						${sql.update(request, ["id", "userId"])}
					WHERE
						${sql.and([
							sql`${sql("id")} = ${request.id}`,
							sql`${sql("userId")} = ${request.userId}`,
							sql`${sql("role")} = ${MessageRole.enums.AGENT}`,
						])}
				`,
				Request: AgentMessageModel.update.mapFields(Struct.pick(["id", "userId", "status", "metadata"])),
			});

			const updateStreamedMessagePartData = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("messagePart")}
					SET
						${sql.update({ data: sql.json(request.data) })}
					WHERE
						${sql.and([
							sql`${sql("id")} = ${request.id}`,
							sql`${sql("userId")} = ${request.userId}`,
							sql`${sql.in("type", [MessagePartType.enums.TEXT, MessagePartType.enums.REASONING])}`,
						])}
				`,
				Request: Schema.Union([
					TextMessagePartModel.select.mapFields(Struct.pick(["id", "userId", "data"])),
					ReasoningMessagePartModel.select.mapFields(Struct.pick(["id", "userId", "data"])),
				]),
			});

			const deleteInflightChunksByMessagePartId = SqlSchema.void({
				execute: (request) => sql`
					DELETE FROM ${sql("inflightChunk")}
					WHERE
						${sql("messagePartId")} = ${request.messagePartId};
				`,
				Request: InflightChunkModel.select.mapFields(Struct.pick(["messagePartId"])),
			});

			const deleteConversation = SqlSchema.void({
				execute: (request) => sql`
					DELETE FROM ${sql("conversation")}
					WHERE
						${sql.and([sql`${sql("id")} = ${request.id}`, sql`${sql("userId")} = ${request.userId}`])};
				`,
				Request: ConversationModel.select.mapFields(Struct.pick(["id", "userId"])),
			});

			const deleteMessagesByConversationId = SqlSchema.void({
				execute: (request) => sql`
					DELETE FROM ${sql("message")}
					WHERE
						${sql.and([
							sql`${sql("conversationId")} = ${request.conversationId}`,
							sql`${sql("userId")} = ${request.userId}`,
						])};
				`,
				Request: ConversationModel.select
					.mapFields(Struct.pick(["id", "userId"]))
					.mapFields(Struct.renameKeys({ id: "conversationId" })),
			});

			const deleteMessagePartsByConversationId = SqlSchema.void({
				execute: (request) => sql`
					DELETE FROM ${sql("messagePart")} USING ${sql("message")}
					WHERE
						${sql.and([
							sql`${sql("messagePart")}.${sql("messageId")} = ${sql("message")}.${sql("id")}`,
							sql`${sql("messagePart")}.${sql("userId")} = ${request.userId}`,
							sql`${sql("message")}.${sql("conversationId")} = ${request.conversationId}`,
							sql`${sql("message")}.${sql("userId")} = ${request.userId}`,
						])};
				`,
				Request: ConversationModel.select
					.mapFields(Struct.pick(["id", "userId"]))
					.mapFields(Struct.renameKeys({ id: "conversationId" })),
			});

			const deleteInflightChunksByConversationId = SqlSchema.void({
				execute: (request) => sql`
					DELETE FROM ${sql("inflightChunk")} USING ${sql("messagePart")},
					${sql("message")}
					WHERE
						${sql.and([
							sql`${sql("inflightChunk")}.${sql("messagePartId")} = ${sql("messagePart")}.${sql("id")}`,
							sql`${sql("inflightChunk")}.${sql("userId")} = ${request.userId}`,
							sql`${sql("messagePart")}.${sql("messageId")} = ${sql("message")}.${sql("id")}`,
							sql`${sql("messagePart")}.${sql("userId")} = ${request.userId}`,
							sql`${sql("message")}.${sql("conversationId")} = ${request.conversationId}`,
							sql`${sql("message")}.${sql("userId")} = ${request.userId}`,
						])};
				`,
				Request: ConversationModel.select
					.mapFields(Struct.pick(["id", "userId"]))
					.mapFields(Struct.renameKeys({ id: "conversationId" })),
			});

			const findInflightChunksByMessagePartIdForMaterializing = SqlSchema.findNonEmpty({
				execute: (request) => sql`
					SELECT
						${sql("id")},
						${sql("sequence")},
						${sql("content")},
						${sql("userId")}
					FROM
						${sql("inflightChunk")}
					WHERE
						${sql("messagePartId")} = ${request.messagePartId}
					FOR UPDATE;
				`,
				Request: InflightChunkModel.select.mapFields(Struct.pick(["messagePartId"])),
				Result: InflightChunkModel.select.mapFields(Struct.pick(["id", "sequence", "content", "userId"])),
			});

			const findTextMessagePartForMaterializing = SqlSchema.findOneOption({
				execute: (request) => sql`
					SELECT
						${sql("id")},
						${sql("data")},
						${sql("type")},
						${sql("userId")}
					FROM
						${sql("messagePart")}
					WHERE
						${sql.and([sql`${sql("id")} = ${request.id}`, sql`${sql("type")} = ${MessagePartType.enums.TEXT}`])}
					FOR UPDATE;
				`,
				Request: TextMessagePartModel.select.mapFields(Struct.pick(["id"])),
				Result: TextMessagePartModel.select.mapFields(Struct.pick(["id", "userId", "type", "data"])),
			});

			const findReasoningMessagePartForMaterializing = SqlSchema.findOneOption({
				execute: (request) => sql`
					SELECT
						${sql("id")},
						${sql("data")},
						${sql("type")},
						${sql("userId")}
					FROM
						${sql("messagePart")}
					WHERE
						${sql.and([sql`${sql("id")} = ${request.id}`, sql`${sql("type")} = ${MessagePartType.enums.REASONING}`])}
					FOR UPDATE;
				`,
				Request: ReasoningMessagePartModel.select.mapFields(Struct.pick(["id"])),
				Result: ReasoningMessagePartModel.select.mapFields(Struct.pick(["id", "userId", "type", "data"])),
			});

			const findConversationMetadataForVerification = SqlSchema.findOneOption({
				execute: (request) => sql`
					SELECT
						${sql("id")},
						${sql("userId")}
					FROM
						${sql("conversation")}
					WHERE
						${sql.and([sql`${sql("id")} = ${request.id}`, sql`${sql("userId")} = ${request.userId}`])};
				`,
				Request: ConversationModel.select.mapFields(Struct.pick(["id", "userId"])),
				Result: ConversationModel.select.mapFields(Struct.pick(["id", "userId"])),
			});

			const findConversationMetadataForUpdate = SqlSchema.findOneOption({
				execute: (request) => sql`
					SELECT
						${sql("id")},
						${sql("userId")}
					FROM
						${sql("conversation")}
					WHERE
						${sql.and([sql`${sql("id")} = ${request.id}`, sql`${sql("userId")} = ${request.userId}`])}
					FOR UPDATE;
				`,
				Request: ConversationModel.select.mapFields(Struct.pick(["id", "userId"])),
				Result: ConversationModel.select.mapFields(Struct.pick(["id", "userId"])),
			});

			const findAgentMessageMetadataForStatusUpdate = SqlSchema.findOneOption({
				execute: (request) => sql`
					SELECT
						${sql("id")},
						${sql("userId")},
						${sql("conversationId")},
						${sql("status")}
					FROM
						${sql("message")}
					WHERE
						${sql.and([
							sql`${sql("id")} = ${request.id}`,
							sql`${sql("userId")} = ${request.userId}`,
							sql`${sql("role")} = ${MessageRole.enums.AGENT}`,
						])}
					FOR UPDATE;
				`,
				Request: AgentMessageModel.select.mapFields(Struct.pick(["id", "userId"])),
				Result: AgentMessageModel.select.mapFields(Struct.pick(["id", "userId", "status", "conversationId"])),
			});

			const findConversationForGeneration = SqlSchema.findOneOption({
				execute: (request) => sql`
					SELECT
						${sql("id")},
						${sql("userId")}
					FROM
						${sql("conversation")}
					WHERE
						${sql("id")} = ${request.id};
				`,
				Request: ConversationModel.select.mapFields(Struct.pick(["id"])),
				Result: ConversationModel.select.mapFields(Struct.pick(["id", "userId"])),
			});

			const findMessagesByConversationIdForGeneration = SqlSchema.findAll({
				execute: (request) => sql`
					SELECT
						${sql("id")},
						${sql("parentId")},
						${sql("role")},
						${sql("status")}
					FROM
						${sql("message")}
					WHERE
						${sql("conversationId")} = ${request.conversationId};
				`,
				Request: Schema.Union([
					AgentMessageModel.select.mapFields(Struct.pick(["conversationId"])),
					UserMessageModel.select.mapFields(Struct.pick(["conversationId"])),
				]),
				Result: Schema.Union([
					AgentMessageModel.select.mapFields(Struct.pick(["id", "parentId", "role", "status"])),
					UserMessageModel.select.mapFields(Struct.pick(["id", "parentId", "role"])),
				]),
			});

			const findMessagePartsByConversationIdForGeneration = SqlSchema.findAll({
				execute: (request) => sql`
					SELECT
						${sql("messagePart")}.${sql("type")},
						${sql("messagePart")}.${sql("createdAt")},
						${sql("messagePart")}.${sql("data")},
						${sql("messagePart")}.${sql("messageId")}
					FROM
						${sql("messagePart")}
						JOIN ${sql("message")} ON ${sql("messagePart")}.${sql("messageId")} = ${sql("message")}.${sql("id")}
					WHERE
						${sql("message")}.${sql("conversationId")} = ${request.conversationId};
				`,
				Request: Schema.Union([
					AgentMessageModel.select.mapFields(Struct.pick(["conversationId"])),
					UserMessageModel.select.mapFields(Struct.pick(["conversationId"])),
				]),
				Result: Schema.Union([
					TextMessagePartModel.select.mapFields(Struct.pick(["type", "createdAt", "data", "messageId"])),
					ReasoningMessagePartModel.select.mapFields(Struct.pick(["type", "createdAt", "data", "messageId"])),
				]),
			});

			const mapMessagePartForInsert = Match.type<
				UserMessagePartInput & { messageId: UserMessageModel["id"]; userId: UserMessageModel["userId"] }
			>().pipe(
				Match.withReturnType<Parameters<typeof insertMessageParts>[0][number]>(),
				Match.when({ type: "TEXT" }, (part) => ({
					createdAt: undefined,
					data: part.data,
					id: part.id,
					messageId: part.messageId,
					type: "TEXT",
					userId: part.userId,
				})),
				Match.exhaustive,
			);

			return Conversation.of({
				system: {
					deleteInflightChunks: Effect.fn("@naamio/mercury/Conversation#deleteInflightChunks")(
						function* (messagePartId) {
							yield* deleteInflightChunksByMessagePartId({ messagePartId }).pipe(
								Effect.catchTag(["SchemaError", "SqlError"], Effect.die),
							);
						},
					),
					findConversationForGeneration: Effect.fn("@naamio/mercury/Conversation#findConversationForGeneration")(
						function* (conversationId) {
							const conversationForGeneration = yield* Effect.gen(function* () {
								const [maybeConversationMetadata, messages, messageParts] = yield* Effect.all([
									findConversationForGeneration({ id: conversationId }),
									findMessagesByConversationIdForGeneration({ conversationId }),
									findMessagePartsByConversationIdForGeneration({ conversationId }),
								]).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

								if (Option.isNone(maybeConversationMetadata)) {
									return Option.none();
								}

								if (!Array.isReadonlyArrayNonEmpty(messages) || !Array.isReadonlyArrayNonEmpty(messageParts)) {
									return Option.none();
								}

								const agentMessagesById = new Map<AgentMessageForGeneration["id"], AgentMessageForGeneration>(
									pipe(
										messages,
										Array.filter((message) => message.role === "AGENT"),
										Array.map((message) => [message.id, { ...message, parts: [] }]),
									),
								);

								const userMessagesById = new Map<UserMessageForGeneration["id"], UserMessageForGeneration>(
									pipe(
										messages,
										Array.filter((message) => message.role === "USER"),
										Array.map((message) => [message.id, { ...message, parts: [] }]),
									),
								);

								yield* Effect.forEach(
									messageParts,
									Effect.fn(function* (messagePart) {
										if (messagePart.type === "REASONING") {
											const maybeMessage = yield* Option.fromUndefinedOr(agentMessagesById.get(messagePart.messageId));

											maybeMessage.parts.push(messagePart);

											return;
										}

										const maybeMessage = yield* Option.firstSomeOf([
											Option.fromUndefinedOr(agentMessagesById.get(messagePart.messageId as never)),
											Option.fromUndefinedOr(userMessagesById.get(messagePart.messageId as never)),
										]);

										maybeMessage.parts.push(messagePart);

										return;
									}),
								).pipe(Effect.catchTag("NoSuchElementError", Effect.die));

								const conversationForGeneration: ConversationForGeneration = {
									messages: Array.appendAll(agentMessagesById.values(), userMessagesById.values()),
									userId: maybeConversationMetadata.value.userId,
								};

								Array.forEach(conversationForGeneration.messages, (message) => {
									message.parts = Array.sortWith(message.parts, (part) => part.createdAt, DateTime.Order);
								});

								return Option.some(conversationForGeneration);
							}).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die));

							return conversationForGeneration;
						},
					),
					insertInflightChunk: Effect.fn("@naamio/mercury/Conversation#insertInflightChunk")(function* (inflightChunk) {
						yield* insertInflightChunk({
							content: inflightChunk.content,
							id: InflightChunkModel.fields.id.makeUnsafe(yield* generateId()),
							messagePartId: inflightChunk.messagePartId,
							sequence: inflightChunk.sequence,
							userId: inflightChunk.userId,
						}).pipe(Effect.catchTag(["SchemaError", "SqlError"], Effect.die));
					}),
					insertReasoningMessagePart: Effect.fn("@naamio/mercury/Conversation#insertReasoningMessagePart")(
						function* (part) {
							yield* insertMessageParts([
								{
									createdAt: undefined,
									data: part.data,
									id: ReasoningMessagePartModel.fields.id.makeUnsafe(yield* generateId()),
									messageId: part.messageId,
									type: "REASONING",
									userId: part.userId,
								},
							]).pipe(Effect.catchTag(["SchemaError", "SqlError"], Effect.die));
						},
					),
					insertTextMessagePart: Effect.fn("@naamio/mercury/Conversation#insertTextMessagePart")(function* (part) {
						const id = TextMessagePartModel.fields.id.makeUnsafe(yield* generateId());

						yield* insertMessageParts([
							{
								createdAt: undefined,
								data: part.data,
								id,
								messageId: part.messageId,
								type: "TEXT",
								userId: part.userId,
							},
						]).pipe(Effect.catchTag(["SchemaError", "SqlError"], Effect.die));

						return { id };
					}),
					materializeReasoningMessagePart: Effect.fn("@naamio/mercury/Conversation#materializeReasoningMessagePart")(
						function* (id) {
							yield* Effect.gen(function* () {
								const [inflightChunks, maybeStreamedMessagePart] = yield* Effect.all([
									findInflightChunksByMessagePartIdForMaterializing({ messagePartId: id }).pipe(
										Effect.catchTag(["SqlError", "SchemaError"], Effect.die),
										Effect.catchTag("NoSuchElementError", () => Effect.fail(new MessagePartMaterializationError())),
									),
									findReasoningMessagePartForMaterializing({ id }).pipe(
										Effect.catchTag(["SqlError", "SchemaError"], Effect.die),
									),
								]);

								if (
									Option.isNone(maybeStreamedMessagePart)
									|| Option.isSome(maybeStreamedMessagePart.value.data.content)
								) {
									return yield* new MessagePartMaterializationError();
								}

								const finalContent = pipe(
									inflightChunks,
									Array.sortWith((chunk) => chunk.sequence, Order.Number),
									Array.map((chunk) => chunk.content),
									Array.join(""),
								);

								yield* updateStreamedMessagePartData({
									data: { ...maybeStreamedMessagePart.value.data, content: Option.some(finalContent) },
									id: maybeStreamedMessagePart.value.id,
									userId: maybeStreamedMessagePart.value.userId,
								}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));
							}).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die));
						},
					),
					materializeTextMessagePart: Effect.fn("@naamio/mercury/Conversation#materializeTextMessagePart")(
						function* (id) {
							yield* Effect.gen(function* () {
								const [inflightChunks, maybeStreamedMessagePart] = yield* Effect.all([
									findInflightChunksByMessagePartIdForMaterializing({ messagePartId: id }).pipe(
										Effect.catchTag(["SqlError", "SchemaError"], Effect.die),
										Effect.catchTag("NoSuchElementError", () => Effect.fail(new MessagePartMaterializationError())),
									),
									findTextMessagePartForMaterializing({ id }).pipe(
										Effect.catchTag(["SqlError", "SchemaError"], Effect.die),
									),
								]);

								if (
									Option.isNone(maybeStreamedMessagePart)
									|| Option.isSome(maybeStreamedMessagePart.value.data.content)
								) {
									return yield* new MessagePartMaterializationError();
								}

								const finalContent = pipe(
									inflightChunks,
									Array.sortWith((chunk) => chunk.sequence, Order.Number),
									Array.map((chunk) => chunk.content),
									Array.join(""),
								);

								yield* updateStreamedMessagePartData({
									data: { ...maybeStreamedMessagePart.value.data, content: Option.some(finalContent) },
									id: maybeStreamedMessagePart.value.id,
									userId: maybeStreamedMessagePart.value.userId,
								}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));
							}).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die));
						},
					),
					transitionMessageToError: Effect.fn("@naamio/mercury/Conversation#transitionMessageToError")(
						function* (message) {
							yield* Effect.gen(function* () {
								const maybeAgentMessageMetadata = yield* findAgentMessageMetadataForStatusUpdate({
									id: message.id,
									userId: message.userId,
								}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

								if (Option.isNone(maybeAgentMessageMetadata)) {
									return yield* new MissingMessageError();
								}

								if (maybeAgentMessageMetadata.value.status !== "IN_PROGRESS") {
									return yield* new MessageAlreadyTransitionedError();
								}

								yield* updateAgentMessageStatus({
									id: maybeAgentMessageMetadata.value.id,
									status: "ERROR",
									userId: maybeAgentMessageMetadata.value.userId,
								}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));
							}).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die));
						},
					),
					transitionMessageToFinished: Effect.fn("@naamio/mercury/Conversation#transitionMessageToFinished")(
						function* (message) {
							yield* Effect.gen(function* () {
								const maybeAgentMessageMetadata = yield* findAgentMessageMetadataForStatusUpdate({
									id: message.id,
									userId: message.userId,
								}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

								if (Option.isNone(maybeAgentMessageMetadata)) {
									return yield* new MissingMessageError();
								}

								if (maybeAgentMessageMetadata.value.status !== "IN_PROGRESS") {
									return yield* new MessageAlreadyTransitionedError();
								}

								yield* updateAgentMessageStatusWithMetadata({
									id: maybeAgentMessageMetadata.value.id,
									metadata: Option.some(message.metadata),
									status: "FINISHED",
									userId: maybeAgentMessageMetadata.value.userId,
								}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));
							}).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die));
						},
					),
				},
				viewer: {
					createConversation: Effect.fn("@naamio/mercury/Conversation#createConversation")(function* (input) {
						const currentSession = yield* CurrentSession;

						const transactionId = yield* Effect.gen(function* () {
							yield* insertConversation({
								accessedAt: yield* DateTime.now,
								createdAt: undefined,
								id: input.conversationId,
								title: Option.none(),
								updatedAt: yield* DateTime.now,
								userId: currentSession.userId,
							}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

							const userMessageInput = input.messages[0];
							const agentMessageInput = input.messages[1];

							yield* insertMessages([
								{
									conversationId: input.conversationId,
									createdAt: undefined,
									id: userMessageInput.id,
									parentId: Option.none(),
									role: "USER",
									userId: currentSession.userId,
								},
								{
									conversationId: input.conversationId,
									createdAt: undefined,
									id: agentMessageInput.id,
									metadata: Option.none(),
									parentId: userMessageInput.id,
									role: "AGENT",
									status: "IN_PROGRESS",
									userId: currentSession.userId,
								},
							]).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

							yield* insertMessageParts(
								Array.map(userMessageInput.parts, (part) =>
									mapMessagePartForInsert({ ...part, messageId: userMessageInput.id, userId: currentSession.userId }),
								),
							).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

							return yield* getTransactionId();
						}).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die));

						return { transactionId };
					}),
					deleteConversation: Effect.fn("@naamio/mercury/Conversation#deleteConversation")(function* (id) {
						const currentSession = yield* CurrentSession;

						const transactionId = yield* Effect.gen(function* () {
							const maybeConversationMetadata = yield* findConversationMetadataForUpdate({
								id,
								userId: currentSession.userId,
							}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

							if (Option.isNone(maybeConversationMetadata)) {
								return yield* new MissingConversationError();
							}

							yield* deleteInflightChunksByConversationId({ conversationId: id, userId: currentSession.userId }).pipe(
								Effect.catchTag(["SqlError", "SchemaError"], Effect.die),
							);
							yield* deleteMessagePartsByConversationId({ conversationId: id, userId: currentSession.userId }).pipe(
								Effect.catchTag(["SqlError", "SchemaError"], Effect.die),
							);
							yield* deleteMessagesByConversationId({ conversationId: id, userId: currentSession.userId }).pipe(
								Effect.catchTag(["SqlError", "SchemaError"], Effect.die),
							);
							yield* deleteConversation({ id, userId: currentSession.userId }).pipe(
								Effect.catchTag(["SqlError", "SchemaError"], Effect.die),
							);

							return yield* getTransactionId();
						});

						return { transactionId };
					}),
					editConversationTitle: Effect.fn("@naamio/mercury/Conversation#editConversationTitle")(function* (input) {
						const currentSession = yield* CurrentSession;

						const transactionId = yield* Effect.gen(function* () {
							const maybeConversationMetadata = yield* findConversationMetadataForUpdate({
								id: input.conversationId,
								userId: currentSession.userId,
							}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

							if (Option.isNone(maybeConversationMetadata)) {
								return yield* new MissingConversationError();
							}

							yield* updateConversationTitle({
								id: input.conversationId,
								title: Option.some(input.title),
								updatedAt: yield* DateTime.now,
								userId: currentSession.userId,
							}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

							return yield* getTransactionId();
						});

						return { transactionId };
					}),
					updateConversationWithContinuation: Effect.fn(
						"@naamio/mercury/Conversation#updateConversationWithContinuation",
					)(function* (input) {
						const currentSession = yield* CurrentSession;

						const transactionId = yield* Effect.gen(function* () {
							const maybeConversationMetadata = yield* findConversationMetadataForUpdate({
								id: input.conversationId,
								userId: currentSession.userId,
							}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

							if (Option.isNone(maybeConversationMetadata)) {
								return yield* new MissingConversationError();
							}

							yield* updateConversationUpdatedAt({
								id: maybeConversationMetadata.value.id,
								updatedAt: yield* DateTime.now,
								userId: currentSession.userId,
							}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

							const userMessageInput = input.messages[0];
							const agentMessageInput = input.messages[1];

							yield* insertMessages([
								{
									conversationId: maybeConversationMetadata.value.id,
									createdAt: undefined,
									id: userMessageInput.id,
									parentId: userMessageInput.parentId,
									role: "USER",
									userId: currentSession.userId,
								},
								{
									conversationId: maybeConversationMetadata.value.id,
									createdAt: undefined,
									id: agentMessageInput.id,
									metadata: Option.none(),
									parentId: userMessageInput.id,
									role: "AGENT",
									status: "IN_PROGRESS",
									userId: currentSession.userId,
								},
							]).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

							yield* insertMessageParts(
								Array.map(userMessageInput.parts, (part) =>
									mapMessagePartForInsert({ ...part, messageId: userMessageInput.id, userId: currentSession.userId }),
								),
							).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

							return yield* getTransactionId();
						}).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die));

						return { transactionId };
					}),
					updateConversationWithRegeneration: Effect.fn(
						"@naamio/mercury/Conversation#updateConversationWithRegeneration",
					)(function* (input) {
						const currentSession = yield* CurrentSession;

						const transactionId = yield* Effect.gen(function* () {
							const maybeConversationMetadata = yield* findConversationMetadataForUpdate({
								id: input.conversationId,
								userId: currentSession.userId,
							}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

							if (Option.isNone(maybeConversationMetadata)) {
								return yield* new MissingConversationError();
							}

							yield* updateConversationUpdatedAt({
								id: maybeConversationMetadata.value.id,
								updatedAt: yield* DateTime.now,
								userId: currentSession.userId,
							}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

							yield* insertMessages([
								{
									conversationId: maybeConversationMetadata.value.id,
									createdAt: undefined,
									id: input.message.id,
									metadata: Option.none(),
									parentId: input.message.parentId,
									role: "AGENT",
									status: "IN_PROGRESS",
									userId: currentSession.userId,
								},
							]).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

							return yield* getTransactionId();
						}).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die));

						return { transactionId };
					}),
					updateMessageWithInterruption: Effect.fn("@naamio/mercury/Conversation#updateMessageWithInterruption")(
						function* (input) {
							const currentSession = yield* CurrentSession;

							const transactionId = yield* Effect.gen(function* () {
								const [maybeConversationMetadata, maybeAgentMessageMetadata] = yield* Effect.all([
									findConversationMetadataForUpdate({ id: input.conversationId, userId: currentSession.userId }).pipe(
										Effect.catchTag(["SqlError", "SchemaError"], Effect.die),
									),
									findAgentMessageMetadataForStatusUpdate({ id: input.messageId, userId: currentSession.userId }).pipe(
										Effect.catchTag(["SqlError", "SchemaError"], Effect.die),
									),
								]);

								if (Option.isNone(maybeConversationMetadata)) {
									return yield* new MissingConversationError();
								}

								if (
									Option.isNone(maybeAgentMessageMetadata)
									|| maybeAgentMessageMetadata.value.conversationId !== maybeConversationMetadata.value.id
								) {
									return yield* new MissingMessageError();
								}

								const transactionId = yield* getTransactionId();

								if (maybeAgentMessageMetadata.value.status === "INTERRUPTED") {
									return transactionId;
								}

								if (
									maybeAgentMessageMetadata.value.status === "ERROR"
									|| maybeAgentMessageMetadata.value.status === "FINISHED"
								) {
									return yield* new MessageAlreadyTransitionedError();
								}

								yield* updateAgentMessageStatus({
									id: maybeAgentMessageMetadata.value.id,
									status: "INTERRUPTED",
									userId: currentSession.userId,
								}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

								return transactionId;
							}).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die));

							return { transactionId };
						},
					),
					verifyConversationExistence: Effect.fn("@naamio/mercury/Conversation#verifyConversationExistence")(
						function* (id) {
							const currentSession = yield* CurrentSession;

							const maybeConversation = yield* findConversationMetadataForVerification({
								id,
								userId: currentSession.userId,
							}).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die));

							if (Option.isNone(maybeConversation)) {
								return yield* new MissingConversationError();
							}
						},
					),
				},
			});
		}),
	).pipe(Layer.provide([DatabaseLayer])) satisfies Layer.Layer<Conversation, unknown>;
}

export const InflightChunkCleanupWorkflow = Workflow.make({
	idempotencyKey: (payload) => payload.messagePartId,
	name: "InflightChunkCleanupWorkflow",
	payload: { messagePartId: InflightChunkModel.select.fields.messagePartId },
});

export const InflightChunkCleanupWorkflowLayer = InflightChunkCleanupWorkflow.toLayer(
	Effect.fn(function* (payload) {
		const conversation = yield* Conversation;

		yield* DurableClock.sleep({ duration: Duration.minutes(5), name: "AwaitMessagePartMaterializationSync" });

		yield* conversation.system.deleteInflightChunks(payload.messagePartId);
	}),
).pipe(Layer.provide([WorkflowEngineLayer, Conversation.layer]));
