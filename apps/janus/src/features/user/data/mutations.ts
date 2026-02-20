import { createOptimisticAction } from "@tanstack/react-db";
import { useServerFn } from "@tanstack/react-start";

import type { Session } from "#src/features/user/data/session.js";
import type { User } from "#src/features/user/data/user.js";

import { useSessionId, useUser } from "#src/features/user/data/queries.js";
import { sessionCollection } from "#src/features/user/data/session.js";
import { userCollection } from "#src/features/user/data/user.js";
import { revokeAllSessions, revokeSession, updateLanguage } from "#src/features/user/procedures/mod.js";

export const useUpdateLanguage = () => {
	const callUpdateLanguage = useServerFn(updateLanguage);

	const userId = useUser().id;

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callUpdateLanguage({ data: { language: data.language } });

			return userCollection.utils.awaitTxId(result.transactionId);
		},
		onMutate: (data: { language: User["language"] }) => {
			userCollection.update(userId, (draft) => {
				draft.language = data.language;
			});
		},
	});

	return action;
};

export const useSignOut = () => {
	const callRevokeSession = useServerFn(revokeSession);

	const sessionId = useSessionId();

	const action = async () => {
		await callRevokeSession({ data: { id: sessionId } });
	};

	return action;
};

export const useRevokeSession = () => {
	const callRevokeSession = useServerFn(revokeSession);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callRevokeSession({ data: { id: data.id } });

			return sessionCollection.utils.awaitTxId(result.transactionId);
		},
		onMutate: (data: { id: Session["id"] }) => {
			sessionCollection.delete(data.id);
		},
	});

	return action;
};

export const useRevokeAllSessions = () => {
	const callRevokeAllSessions = useServerFn(revokeAllSessions);

	const action = async () => {
		await callRevokeAllSessions();
	};

	return action;
};
