import { Trans } from "@lingui/react/macro";
import { startRegistration } from "@simplewebauthn/browser";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";

import stylex from "@naamio/stylex";

import { generateRegistrationOptions, verifyRegistration } from "#src/features/home/procedures/mod.js";
import { useLanguage } from "#src/lib/i18n/use-language.js";

const styles = stylex.create({
	form: { alignItems: "flex-start", display: "flex", flexDirection: "column", gap: 8 },
	input: { borderColor: "black", borderStyle: "solid", borderWidth: 1 },
});

export const SignUpPage = () => {
	const id = useId();

	const language = useLanguage();

	const [username, setUsername] = useState("");
	const [displayName, setDisplayName] = useState("");

	const usernameFieldId = `username-field-${id}`;
	const displayNameFieldId = `display-name-field-${id}`;

	const callGenerateRegistrationOptions = useServerFn(generateRegistrationOptions);
	const callVerifyRegistration = useServerFn(verifyRegistration);

	return (
		<div>
			<h1>
				<Trans>Sign up page</Trans>
			</h1>
			<form
				onSubmit={async (event) => {
					event.preventDefault();

					const result = await callGenerateRegistrationOptions({ data: { displayName, language, username } });

					const registrationResponse = await startRegistration({ optionsJSON: result.registrationOptions });

					await callVerifyRegistration({ data: { registrationResponse } });
				}}
				{...stylex.props(styles.form)}
			>
				<label htmlFor={usernameFieldId}>
					<Trans>Username</Trans>
				</label>
				<input
					onChange={(event) => {
						setUsername(event.currentTarget.value);
					}}
					id={usernameFieldId}
					maxLength={24}
					minLength={5}
					type="text"
					value={username}
					required
					{...stylex.props(styles.input)}
				/>
				<label htmlFor={displayNameFieldId}>
					<Trans>Display name</Trans>
				</label>
				<input
					onChange={(event) => {
						setDisplayName(event.currentTarget.value);
					}}
					id={displayNameFieldId}
					maxLength={50}
					minLength={3}
					type="text"
					value={displayName}
					required
					{...stylex.props(styles.input)}
				/>
				<button type="submit">
					<Trans>Sign up</Trans>
				</button>
			</form>
		</div>
	);
};
