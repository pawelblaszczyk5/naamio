import type { Effect } from "effect";

import { Context } from "effect";

import type { CurrentSession } from "@naamio/api/middlewares/authenticated-only";
import type { TransactionId } from "@naamio/schema/domain";

import type { MissingConversationError, MissingMessageError } from "#src/features/chat/errors.js";
import type {
	ContinueConversationInput,
	InterruptGenerationInput,
	RegenerateAnswerInput,
	StartConversationInput,
} from "#src/features/chat/types.js";

export class Chat extends Context.Tag("@naamio/mercury/Chat")<
	Chat,
	{
		viewer: {
			continueConversation: (
				input: ContinueConversationInput,
			) => Effect.Effect<{ transactionId: TransactionId }, MissingConversationError, CurrentSession>;
			interruptGeneration: (
				input: InterruptGenerationInput,
			) => Effect.Effect<
				{ transactionId: TransactionId },
				MissingConversationError | MissingMessageError,
				CurrentSession
			>;
			regenerateAnswer: (
				input: RegenerateAnswerInput,
			) => Effect.Effect<{ transactionId: TransactionId }, MissingConversationError, CurrentSession>;
			startConversation: (
				input: StartConversationInput,
			) => Effect.Effect<{ transactionId: TransactionId }, never, CurrentSession>;
		};
	}
>() {}
