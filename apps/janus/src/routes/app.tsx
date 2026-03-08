import { createFileRoute } from "@tanstack/react-router";
import { Function, Match } from "effect";

import { AppLayout } from "#src/features/app/ui/app-layout.js";
import { preloadConversationData } from "#src/features/chat/data/conversation.js";
import { preloadInflightChunkData } from "#src/features/chat/data/inflight-chunk.js";
import { preloadMessagePartData } from "#src/features/chat/data/message-part.js";
import { preloadMessageData } from "#src/features/chat/data/message.js";
import { preloadPasskeyData } from "#src/features/user/data/passkey.js";
import {
	checkSessionCacheStatus,
	hydrateSessionCache,
	refreshSessionCache,
} from "#src/features/user/data/session-verification.js";
import { preloadSessionData } from "#src/features/user/data/session.js";
import { preloadUserData } from "#src/features/user/data/user.js";
import { initializePool } from "#src/lib/id-pool/mod.js";

export const Route = createFileRoute("/app")({
	ssr: false,
	component: AppLayout,
	beforeLoad: async () => {
		const sessionCacheStatus = checkSessionCacheStatus();

		await Match.value(sessionCacheStatus).pipe(
			Match.when("FRESH", Function.constVoid),
			Match.when("MISSING", async () => hydrateSessionCache()),
			Match.when("STALE", () => void refreshSessionCache()),
			Match.exhaustive,
		);
	},
	loader: async () => {
		await Promise.all([
			preloadUserData(),
			preloadSessionData(),
			preloadPasskeyData(),
			preloadConversationData(),
			preloadMessageData(),
			preloadMessagePartData(),
			preloadInflightChunkData(),
			initializePool(),
		]);
	},
});
