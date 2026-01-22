import { Trans, useLingui } from "@lingui/react/macro";

import { useSessionId, useSessions } from "#src/features/auth/data/queries.js";
import { useUser } from "#src/features/user/data/queries.js";

export const SettingsPage = () => {
	const user = useUser();
	const sessionId = useSessionId();
	const sessions = useSessions();

	const { i18n, t } = useLingui();

	return (
		<div>
			<h1>
				<Trans>Settings</Trans>
			</h1>
			<p>
				<Trans>Your email address: {{ email: user.email }}</Trans>
			</p>
			<p>
				<Trans>Your language: {{ language: user.language }}</Trans>
			</p>
			<p>
				<Trans>Your user ID: {{ id: user.id }}</Trans>
			</p>
			<h2>
				<Trans>Sessions</Trans>
			</h2>
			<ul>
				{sessions.map((session) => (
					<li key={session.id}>
						<Trans>
							Session for device "{{ label: session.deviceLabel ?? t`Unknown device` }}", expires at{" "}
							{{ date: i18n.date(session.expiresAt) }}
						</Trans>{" "}
						{session.id === sessionId && <Trans>Current session</Trans>}
					</li>
				))}
			</ul>
		</div>
	);
};
