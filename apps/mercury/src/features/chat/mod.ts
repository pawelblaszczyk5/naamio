import { Effect, Layer, ServiceMap } from "effect";

import type { ConversationModel, TransactionId } from "@naamio/schema/domain";

import { CurrentSession } from "@naamio/api/middlewares/authenticated-only";

import type {
	MessageAlreadyTransitionedError,
	MissingConversationError,
	MissingMessageError,
} from "#src/features/chat/errors.js";
import type {
	ContinueConversationInput,
	EditConversationTitleInput,
	InterruptGenerationInput,
	RegenerateAnswerInput,
	StartConversationInput,
} from "#src/features/chat/types.js";

import {
	ConversationGenerationManagerEntity,
	ConversationGenerationManagerEntityLayer,
} from "#src/features/chat/conversation-generation-manager.js";
import { Conversation } from "#src/features/chat/conversation.js";
import { ConversationGenerationManagerNetworkingError } from "#src/features/chat/errors.js";
import { ClusterRunnerLayer } from "#src/lib/cluster/mod.js";

export class Chat extends ServiceMap.Service<
	Chat,
	{
		readonly viewer: {
			readonly continueConversation: (
				input: ContinueConversationInput,
			) => Effect.Effect<
				{ transactionId: TransactionId },
				ConversationGenerationManagerNetworkingError | MissingConversationError,
				CurrentSession
			>;
			readonly deleteConversation: (
				id: ConversationModel["id"],
			) => Effect.Effect<
				{ transactionId: TransactionId },
				ConversationGenerationManagerNetworkingError | MissingConversationError,
				CurrentSession
			>;
			readonly editConversationTitle: (
				input: EditConversationTitleInput,
			) => Effect.Effect<{ transactionId: TransactionId }, MissingConversationError, CurrentSession>;
			readonly interruptGeneration: (
				input: InterruptGenerationInput,
			) => Effect.Effect<
				{ transactionId: TransactionId },
				| ConversationGenerationManagerNetworkingError
				| MessageAlreadyTransitionedError
				| MissingConversationError
				| MissingMessageError,
				CurrentSession
			>;
			readonly markConversationAsAccessed: (
				id: ConversationModel["id"],
			) => Effect.Effect<{ transactionId: TransactionId }, MissingConversationError, CurrentSession>;
			readonly regenerateAnswer: (
				input: RegenerateAnswerInput,
			) => Effect.Effect<
				{ transactionId: TransactionId },
				ConversationGenerationManagerNetworkingError | MissingConversationError,
				CurrentSession
			>;
			readonly startConversation: (
				input: StartConversationInput,
			) => Effect.Effect<
				{ transactionId: TransactionId },
				ConversationGenerationManagerNetworkingError,
				CurrentSession
			>;
		};
	}
>()("@naamio/mercury/Chat") {
	static layer = Layer.effect(
		this,
		Effect.gen(function* () {
			const conversation = yield* Conversation;
			const conversationGenerationManagerClient = yield* ConversationGenerationManagerEntity.client;

			return Chat.of({
				viewer: {
					continueConversation: Effect.fn("@naamio/mercury/Chat#continueConversation")(function* (input) {
						const conversationGenerationManager = conversationGenerationManagerClient(input.conversationId);

						const result = yield* conversation.viewer.updateConversationWithContinuation(input);

						yield* conversationGenerationManager
							.StartGeneration({ messageId: input.messages[1].id }, { discard: true })
							.pipe(
								Effect.catchTag(["AlreadyProcessingMessage", "MailboxFull", "PersistenceError"], () =>
									Effect.fail(new ConversationGenerationManagerNetworkingError()),
								),
							);

						return result;
					}),
					deleteConversation: Effect.fn("@naamio/mercury/Chat#deleteConversation")(function* (id) {
						const conversationGenerationManager = conversationGenerationManagerClient(id);

						yield* conversation.viewer.verifyConversationExistence(id);

						yield* conversationGenerationManager
							.Cleanup(undefined)
							.pipe(
								Effect.catchTag(["AlreadyProcessingMessage", "MailboxFull", "PersistenceError"], () =>
									Effect.fail(new ConversationGenerationManagerNetworkingError()),
								),
							);

						return yield* conversation.viewer.deleteConversation(id);
					}),
					editConversationTitle: Effect.fn("@naamio/mercury/Chat#editConversationTitle")(function* (input) {
						return yield* conversation.viewer.editConversationTitle(input);
					}),
					interruptGeneration: Effect.fn("@naamio/mercury/Chat#interruptGeneration")(function* (input) {
						const conversationGenerationManager = conversationGenerationManagerClient(input.conversationId);

						const result = yield* conversation.viewer.updateMessageWithInterruption(input);

						yield* conversationGenerationManager
							.InterruptGeneration({ messageId: input.messageId }, { discard: true })
							.pipe(
								Effect.catchTag(["AlreadyProcessingMessage", "MailboxFull", "PersistenceError"], () =>
									Effect.fail(new ConversationGenerationManagerNetworkingError()),
								),
							);

						return result;
					}),
					markConversationAsAccessed: Effect.fn("@naamio/mercury/Chat#markConversationAsAccessed")(function* (input) {
						return yield* conversation.viewer.updateConversationAccessedAt(input);
					}),
					regenerateAnswer: Effect.fn("@naamio/mercury/Chat#regenerateAnswer")(function* (input) {
						const conversationGenerationManager = conversationGenerationManagerClient(input.conversationId);

						const result = yield* conversation.viewer.updateConversationWithRegeneration(input);

						yield* conversationGenerationManager
							.StartGeneration({ messageId: input.message.id }, { discard: true })
							.pipe(
								Effect.catchTag(["AlreadyProcessingMessage", "MailboxFull", "PersistenceError"], () =>
									Effect.fail(new ConversationGenerationManagerNetworkingError()),
								),
							);

						return result;
					}),
					startConversation: Effect.fn("@naamio/mercury/Chat#startConversation")(function* (input) {
						const conversationGenerationManager = conversationGenerationManagerClient(input.conversationId);

						const result = yield* conversation.viewer.createConversation(input);

						yield* conversationGenerationManager
							.StartGeneration({ messageId: input.messages[1].id }, { discard: true })
							.pipe(
								Effect.catchTag(["AlreadyProcessingMessage", "MailboxFull", "PersistenceError"], () =>
									Effect.fail(new ConversationGenerationManagerNetworkingError()),
								),
							);

						yield* Effect.gen(function* () {
							const currentSession = yield* CurrentSession;

							yield* Effect.sleep("2 seconds");

							yield* conversation.system.setInitialConversationTitle({
								id: input.conversationId,
								title: "Lorem ipsum",
								userId: currentSession.userId,
							});
						}).pipe(Effect.forkDetach);

						return result;
					}),
				},
			});
		}),
	).pipe(
		Layer.provide([Conversation.layer, ConversationGenerationManagerEntityLayer, ClusterRunnerLayer]),
	) satisfies Layer.Layer<Chat, unknown>;
}
