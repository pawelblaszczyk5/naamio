import { createFileRoute } from "@tanstack/react-router";

import { ChatPage } from "#src/features/chat/ui/chat-page.js";

export const Route = createFileRoute("/app/")({ component: ChatPage });
