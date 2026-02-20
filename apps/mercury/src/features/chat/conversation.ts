import { PgClient } from "@effect/sql-pg";
import { Array, DateTime, Effect, Layer, Match, Option, Order, pipe, Schema, ServiceMap, Struct } from "effect";
import { Model } from "effect/unstable/schema";
import { SqlSchema } from "effect/unstable/sql";

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
	StepCompletionPartModel,
	TextMessagePartModel,
	UserMessageModel,
} from "@naamio/schema/domain";

import type {
	AgentMessageForGeneration,
	ContinueConversationInput,
	ConversationForGeneration,
	InterruptGenerationInput,
	RegenerateAnswerInput,
	StartConversationInput,
	UserMessageForGeneration,
	UserMessagePartInput,
} from "#src/features/chat/types.js";

import {
	CompactionDataError,
	MessageAlreadyTransitionedError,
	MissingConversationError,
	MissingMessageError,
} from "#src/features/chat/errors.js";
import { createGetTransactionId } from "#src/lib/database/utilities.js";

export class Conversation extends ServiceMap.Service<
	Conversation,
	{
		system: {
			compactInflightChunks: (
				messagePartId: InflightChunkModel["messagePartId"],
			) => Effect.Effect<void, CompactionDataError>;
			deleteInflightChunks: (messagePartId: InflightChunkModel["messagePartId"]) => Effect.Effect<void>;
			findConversationForGeneration: (
				id: ConversationModel["id"],
			) => Effect.Effect<Option.Option<ConversationForGeneration>>;
			insertInflightChunk: (
				inflightChunk: Pick<InflightChunkModel, "content" | "messagePartId" | "sequence" | "userId">,
			) => Effect.Effect<void>;
			insertStepCompletionPart: (
				part: Pick<StepCompletionPartModel, "data" | "messageId" | "userId">,
			) => Effect.Effect<void>;
			insertTextMessagePart: (
				part: Pick<TextMessagePartModel, "data" | "messageId" | "userId">,
			) => Effect.Effect<Pick<TextMessagePartModel, "id">>;
			transitionMessageToError: (
				message: Pick<AgentMessageModel, "id" | "userId">,
			) => Effect.Effect<void, MessageAlreadyTransitionedError | MissingMessageError>;
			transitionMessageToFinished: (
				message: Pick<AgentMessageModel, "id" | "userId">,
			) => Effect.Effect<void, MessageAlreadyTransitionedError | MissingMessageError>;
		};
		viewer: {
			createConversation: (
				input: StartConversationInput,
			) => Effect.Effect<{ transactionId: TransactionId }, never, CurrentSession>;
			updateConversationWithContinuation: (
				input: ContinueConversationInput,
			) => Effect.Effect<{ transactionId: TransactionId }, MissingConversationError, CurrentSession>;
			updateConversationWithRegeneration: (
				input: RegenerateAnswerInput,
			) => Effect.Effect<{ transactionId: TransactionId }, MissingConversationError, CurrentSession>;
			updateMessageWithInterruption: (
				input: InterruptGenerationInput,
			) => Effect.Effect<
				{ transactionId: TransactionId },
				MessageAlreadyTransitionedError | MissingConversationError | MissingMessageError,
				CurrentSession
			>;
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
				Request: Schema.NonEmptyArray(Model.Union(AgentMessageModel, UserMessageModel).insert),
			});

			const insertMessageParts = SqlSchema.void({
				execute: (request) => sql`
					INSERT INTO
						${sql("messagePart")} ${sql.insert(
							request.map((messagePart) => ({ ...messagePart, data: sql.json(messagePart.data) })),
						)};
				`,
				Request: Schema.NonEmptyArray(Model.Union(TextMessagePartModel, StepCompletionPartModel).insert),
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

			const updateStreamedMessagePartData = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("messagePart")}
					SET
						${sql.update({ data: sql.json(request.data) })}
					WHERE
						${sql.and([
							sql`${sql("id")} = ${request.id}`,
							sql`${sql("userId")} = ${request.userId}`,
							sql`${sql.in("type", [MessagePartType.enums.TEXT])}`,
						])}
				`,
				Request: Schema.Union([TextMessagePartModel.select.mapFields(Struct.pick(["id", "userId", "data"]))]),
			});

			const deleteInflightChunksByMessagePartId = SqlSchema.void({
				execute: (request) => sql`
					DELETE FROM ${sql("inflightChunk")}
					WHERE
						${sql("messagePartId")} = ${request.messagePartId};
				`,
				Request: InflightChunkModel.select.mapFields(Struct.pick(["messagePartId"])),
			});

			const findInflightChunksByMessagePartIdForCompaction = SqlSchema.findNonEmpty({
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

			const findStreamedMessagePartForCompaction = SqlSchema.findOneOption({
				execute: (request) => sql`
					SELECT
						${sql("id")},
						${sql("data")},
						${sql("type")},
						${sql("userId")}
					FROM
						${sql("messagePart")}
					WHERE
						${sql.and([sql`${sql("id")} = ${request.id}`, sql`${sql.in("type", [MessagePartType.enums.TEXT])}`])}
					FOR UPDATE;
				`,
				Request: Schema.Union([TextMessagePartModel.select.mapFields(Struct.pick(["id"]))]),
				Result: Schema.Union([TextMessagePartModel.select.mapFields(Struct.pick(["id", "userId", "type", "data"]))]),
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
					StepCompletionPartModel.select.mapFields(Struct.pick(["type", "createdAt", "data", "messageId"])),
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
					compactInflightChunks: Effect.fn("@naamio/mercury/Conversation#compactInflightChunks")(
						function* (messagePartId) {
							yield* Effect.gen(function* () {
								const [inflightChunks, maybeStreamedMessagePart] = yield* Effect.all([
									findInflightChunksByMessagePartIdForCompaction({ messagePartId }).pipe(
										Effect.catchTag(["SqlError", "SchemaError"], Effect.die),
										Effect.catchTag("NoSuchElementError", () => Effect.fail(new CompactionDataError())),
									),
									findStreamedMessagePartForCompaction({ id: messagePartId }).pipe(
										Effect.catchTag(["SqlError", "SchemaError"], Effect.die),
									),
								]);

								if (
									Option.isNone(maybeStreamedMessagePart)
									|| Option.isSome(maybeStreamedMessagePart.value.data.content)
								) {
									return yield* new CompactionDataError();
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
										if (messagePart.type === "STEP_COMPLETION") {
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
					insertStepCompletionPart: Effect.fn("@naamio/mercury/Conversation#insertStepCompletionPart")(
						function* (part) {
							yield* insertMessageParts([
								{
									createdAt: undefined,
									data: part.data,
									id: StepCompletionPartModel.fields.id.makeUnsafe(yield* generateId()),
									messageId: part.messageId,
									type: "STEP_COMPLETION",
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

								yield* updateAgentMessageStatus({
									id: maybeAgentMessageMetadata.value.id,
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
				},
			});
		}),
	);
}
