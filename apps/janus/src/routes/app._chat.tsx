import { createFileRoute } from "@tanstack/react-router";

import { ChatLayout } from "#src/features/chat/ui/chat-layout.js";

export const Route = createFileRoute("/app/_chat")({ component: ChatLayout });
