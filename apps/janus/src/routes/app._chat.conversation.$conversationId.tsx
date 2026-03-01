import { createFileRoute, redirect } from "@tanstack/react-router";
import { Schema } from "effect";

import { Conversation } from "#src/features/chat/data/conversation.js";
import { ExistingConversationPage } from "#src/features/chat/ui/existing-conversation-page.js";

const isConversationId = Schema.is(Conversation.fields.id);

export const Route = createFileRoute("/app/_chat/conversation/$conversationId")({
	component: ExistingConversationPage,
	params: {
		parse: (rawParams) => {
			const maybeConversationId = rawParams.conversationId;

			if (!isConversationId(maybeConversationId)) {
				throw redirect({ to: "/app" });
			}

			return { conversationId: maybeConversationId };
		},
	},
});
