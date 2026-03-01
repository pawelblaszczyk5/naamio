import { createFileRoute } from "@tanstack/react-router";

import { NewConversationPage } from "#src/features/chat/ui/new-conversation-page.js";

export const Route = createFileRoute("/app/_chat/")({ component: NewConversationPage });
