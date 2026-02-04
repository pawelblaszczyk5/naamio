import { Trans, useLingui } from "@lingui/react/macro";

import {
	useRevokeAllSessions,
	useRevokeSession,
	useSignOut,
	useUpdateLanguage,
} from "#src/features/user/data/mutations.js";
import { usePasskeys, useSessionId, useSessions, useUser } from "#src/features/user/data/queries.js";
import { useLanguage } from "#src/lib/i18n/use-language.js";

export const SettingsPage = () => {
	const user = useUser();
	const sessionId = useSessionId();
	const sessions = useSessions();
	const passkeys = usePasskeys();

	const { i18n, t } = useLingui();

	const language = useLanguage();

	const updateLanguage = useUpdateLanguage();
	const revokeAllSessions = useRevokeAllSessions();
	const revokeSession = useRevokeSession();
	const signOut = useSignOut();

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
							{{ date: i18n.date(session.expiresAt) }}
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
							{{ date: i18n.date(passkey.createdAt) }}.
						</Trans>{" "}
						{passkey.backedUp ?
							<Trans>This passkey is backed up.</Trans>
						:	<Trans>This passkey isn't backed up</Trans>}
					</li>
				))}
			</ul>
		</div>
	);
};
