import type { Effect } from "effect";

import { ServiceMap } from "effect";

import type { CurrentSession } from "@naamio/api/middlewares/authenticated-only";
import type { TransactionId } from "@naamio/schema/domain";

import type { MissingConversationError, MissingMessageError } from "#src/features/chat/errors.js";
import type {
	ContinueConversationInput,
	InterruptGenerationInput,
	RegenerateAnswerInput,
	StartConversationInput,
} from "#src/features/chat/types.js";

export class Chat extends ServiceMap.Service<
	Chat,
	{
		readonly viewer: {
			readonly continueConversation: (
				input: ContinueConversationInput,
			) => Effect.Effect<{ transactionId: TransactionId }, MissingConversationError, CurrentSession>;
			readonly interruptGeneration: (
				input: InterruptGenerationInput,
			) => Effect.Effect<
				{ transactionId: TransactionId },
				MissingConversationError | MissingMessageError,
				CurrentSession
			>;
			readonly regenerateAnswer: (
				input: RegenerateAnswerInput,
			) => Effect.Effect<{ transactionId: TransactionId }, MissingConversationError, CurrentSession>;
			readonly startConversation: (
				input: StartConversationInput,
			) => Effect.Effect<{ transactionId: TransactionId }, never, CurrentSession>;
		};
	}
>()("@naamio/mercury/Chat") {}
