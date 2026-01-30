import { Trans } from "@lingui/react/macro";
import { startAuthentication } from "@simplewebauthn/browser";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useId, useState } from "react";

import stylex from "@naamio/stylex";

import { generateAuthenticationOptions, verifyAuthentication } from "#src/features/home/procedures/mod.js";

const styles = stylex.create({
	form: { alignItems: "flex-start", display: "flex", flexDirection: "column", gap: 8 },
	input: { borderColor: "black", borderStyle: "solid", borderWidth: 1 },
});

export const SignInPage = () => {
	const id = useId();

	const [username, setUsername] = useState("");

	const usernameFieldId = `username-field-${id}`;

	const callGenerateAuthenticationOptions = useServerFn(generateAuthenticationOptions);
	const callVerifyAuthentication = useServerFn(verifyAuthentication);

	useEffect(() => {
		const abortController = new AbortController();

		void (async () => {
			const result = await callGenerateAuthenticationOptions({ data: {} });

			if (abortController.signal.aborted) {
				return;
			}

			const authenticationResponse = await startAuthentication({
				optionsJSON: result.authenticationOptions,
				useBrowserAutofill: true,
			});

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- that's not true
			if (abortController.signal.aborted) {
				return;
			}

			await callVerifyAuthentication({ data: { authenticationResponse } });
		})();

		return () => {
			abortController.abort();
		};
	}, [callGenerateAuthenticationOptions, callVerifyAuthentication]);

	return (
		<div>
			<h1>
				<Trans>Sign in page</Trans>
			</h1>
			<form
				onSubmit={async (event) => {
					event.preventDefault();

					const result = await callGenerateAuthenticationOptions({ data: { username } });

					const authenticationResponse = await startAuthentication({ optionsJSON: result.authenticationOptions });

					await callVerifyAuthentication({ data: { authenticationResponse } });
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
					autoComplete="username webauthn"
					id={usernameFieldId}
					type="text"
					value={username}
					autoFocus
					{...stylex.props(styles.input)}
				/>
				<button type="submit">
					<Trans>Sign in</Trans>
				</button>
			</form>
		</div>
	);
};
