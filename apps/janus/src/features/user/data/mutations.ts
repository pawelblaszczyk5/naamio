import { createOptimisticAction } from "@tanstack/react-db";
import { useServerFn } from "@tanstack/react-start";
import { Schema } from "effect";

import { useSessionId, useUser } from "#src/features/user/data/queries.js";
import { sessionCollection } from "#src/features/user/data/session.js";
import { userCollection } from "#src/features/user/data/user.js";
import {
	revokeAllSessions,
	revokeSession,
	RevokeSessionPayload,
	updateLanguage,
	UpdateLanguagePayload,
} from "#src/features/user/procedures/mod.js";

export const useUpdateLanguage = () => {
	const callUpdateLanguage = useServerFn(updateLanguage);

	const userId = useUser().id;

	const encodePayload = Schema.encodeSync(UpdateLanguagePayload);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callUpdateLanguage({ data: encodePayload(data) });

			return userCollection.utils.awaitTxId(result.transactionId);
		},
		onMutate: (data: UpdateLanguagePayload) => {
			userCollection.update(userId, (draft) => {
				draft.language = data.language;
			});
		},
	});

	const handler = (data: UpdateLanguagePayload) => {
		const transaction = action(data);

		return { transaction };
	};

	return handler;
};

export const useSignOut = () => {
	const callRevokeSession = useServerFn(revokeSession);

	const sessionId = useSessionId();

	const encodePayload = Schema.encodeSync(RevokeSessionPayload);

	const handler = async () => {
		await callRevokeSession({ data: encodePayload({ id: sessionId }) });
	};

	return handler;
};

export const useRevokeSession = () => {
	const callRevokeSession = useServerFn(revokeSession);

	const encodePayload = Schema.encodeSync(RevokeSessionPayload);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callRevokeSession({ data: encodePayload(data) });

			return sessionCollection.utils.awaitTxId(result.transactionId);
		},
		onMutate: (data: RevokeSessionPayload) => {
			sessionCollection.delete(data.id);
		},
	});

	const handler = (data: RevokeSessionPayload) => {
		const transaction = action(data);

		return transaction;
	};

	return handler;
};

export const useRevokeAllSessions = () => {
	const callRevokeAllSessions = useServerFn(revokeAllSessions);

	const handler = async () => {
		await callRevokeAllSessions();
	};

	return handler;
};
