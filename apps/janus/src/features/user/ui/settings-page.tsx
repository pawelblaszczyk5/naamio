import { Trans, useLingui } from "@lingui/react/macro";
import { createOptimisticAction, useLiveQuery } from "@tanstack/react-db";
import { useServerFn } from "@tanstack/react-start";
import { Schema } from "effect";

import { passkeysCollection, sessionsCollection, usersCollection } from "#src/features/user/data/collections.js";
import { useSessionId, useUser } from "#src/features/user/data/shared.js";
import {
	revokeAllSessions,
	revokeSession,
	RevokeSessionPayload,
	updateLanguage,
	UpdateLanguagePayload,
} from "#src/features/user/procedures/mod.js";
import { useLanguage } from "#src/lib/i18n/use-language.js";

const useUpdateLanguage = () => {
	const callUpdateLanguage = useServerFn(updateLanguage);

	const userId = useUser().id;
	const encodePayload = Schema.encodeSync(UpdateLanguagePayload);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callUpdateLanguage({ data: encodePayload(data) });

			return usersCollection.utils.awaitTxId(result.transactionId);
		},
		onMutate: (data: UpdateLanguagePayload) => {
			usersCollection.update(userId, (draft) => {
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

const useSignOut = () => {
	const callRevokeSession = useServerFn(revokeSession);

	const sessionId = useSessionId();

	const encodePayload = Schema.encodeSync(RevokeSessionPayload);

	const handler = async () => {
		await callRevokeSession({ data: encodePayload({ id: sessionId }) });
	};

	return handler;
};

const useRevokeSession = () => {
	const callRevokeSession = useServerFn(revokeSession);

	const encodePayload = Schema.encodeSync(RevokeSessionPayload);

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const result = await callRevokeSession({ data: encodePayload(data) });

			return sessionsCollection.utils.awaitTxId(result.transactionId);
		},
		onMutate: (data: RevokeSessionPayload) => {
			sessionsCollection.delete(data.id);
		},
	});

	const handler = (data: RevokeSessionPayload) => {
		const transaction = action(data);

		return transaction;
	};

	return handler;
};

const useRevokeAllSessions = () => {
	const callRevokeAllSessions = useServerFn(revokeAllSessions);

	const handler = async () => {
		await callRevokeAllSessions();
	};

	return handler;
};

export const SettingsPage = () => {
	const user = useUser();
	const sessionId = useSessionId();

	const { data: passkeys } = useLiveQuery((q) =>
		q.from({ passkey: passkeysCollection }).orderBy(({ passkey }) => passkey.createdAt, "desc"),
	);

	const { data: sessions } = useLiveQuery((q) =>
		q.from({ session: sessionsCollection }).orderBy(({ session }) => session.expiresAt, "desc"),
	);

	const { t } = useLingui();

	const language = useLanguage();

	const updateLanguage = useUpdateLanguage();
	const revokeAllSessions = useRevokeAllSessions();
	const revokeSession = useRevokeSession();
	const signOut = useSignOut();

	const formatter = Intl.DateTimeFormat(language);

	return (
		<div>
			<h1>
				<Trans>Settings</Trans>
			</h1>
			<p>
				<Trans>Your username: {{ username: user.username }}</Trans>
			</p>
			<p>
				<Trans>Your language: {{ language: user.language }}</Trans>{" "}
				<button
					onClick={() => {
						updateLanguage({ language: language === "en-US" ? "pl-PL" : "en-US" });
					}}
					type="button"
				>
					<Trans>Change language</Trans>
				</button>
			</p>
			<p>
				<Trans>Your user ID: {{ id: user.id }}</Trans>
			</p>
			<h2>
				<Trans>Sessions</Trans>{" "}
				<button
					onClick={() => {
						void revokeAllSessions();
					}}
					type="button"
				>
					<Trans>Revoke all sessions</Trans>
				</button>
			</h2>
			<ul>
				{sessions.map((session) => (
					<li key={session.id}>
						<Trans>
							Session for device "{{ label: session.deviceLabel ?? t`Unknown device` }}", expires at{" "}
							{{ date: formatter.format(session.expiresAt) }}
						</Trans>{" "}
						<button
							onClick={() => {
								if (session.id === sessionId) {
									void signOut();

									return;
								}

								revokeSession({ id: session.id });
							}}
							type="button"
						>
							{session.id === sessionId ?
								<Trans>Sign out</Trans>
							:	<Trans>Revoke session</Trans>}
						</button>{" "}
						{session.id === sessionId && <Trans>Current session</Trans>}
					</li>
				))}
			</ul>
			<h2>
				<Trans>Passkeys</Trans>
			</h2>
			<ul>
				{passkeys.map((passkey) => (
					<li key={passkey.id}>
						<Trans>
							Passkey named "{{ displayName: passkey.displayName }}", created at{" "}
							{{ date: formatter.format(passkey.createdAt) }}.
						</Trans>{" "}
						{passkey.backedUp ?
							<Trans>This passkey is backed up.</Trans>
						:	<Trans>This passkey isn't backed up.</Trans>}
					</li>
				))}
			</ul>
		</div>
	);
};
