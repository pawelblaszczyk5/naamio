import { Trans, useLingui } from "@lingui/react/macro";

import {
	useRevokeAllSessions,
	useRevokeSession,
	useSignOut,
	useUpdateLanguage,
} from "#src/features/user/data/mutations.js";
import { useSessionId, useSessions, useUser } from "#src/features/user/data/queries.js";
import { useLanguage } from "#src/lib/shell/use-language.js";

export const SettingsPage = () => {
	const user = useUser();
	const sessionId = useSessionId();
	const sessions = useSessions();

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
				<Trans>Your email address: {{ email: user.email }}</Trans>
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
		</div>
	);
};
