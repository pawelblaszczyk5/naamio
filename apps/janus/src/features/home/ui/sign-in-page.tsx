import { Trans } from "@lingui/react/macro";
import { startAuthentication } from "@simplewebauthn/browser";
import { useLoaderData } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { useEffect, useId, useState } from "react";

import stylex from "@naamio/stylex";

import {
	generateAuthenticationOptions,
	GenerateAuthenticationOptionsPayload,
	verifyAuthentication,
	VerifyAuthenticationPayload,
} from "#src/features/home/procedures/mod.js";

const styles = stylex.create({
	form: { alignItems: "flex-start", columnGap: 8, display: "flex", flexDirection: "column", rowGap: 8 },
	input: { borderColor: "black", borderStyle: "solid", borderWidth: 1 },
});

export const SignInPage = () => {
	const id = useId();

	const authenticationOptions = useLoaderData({
		from: "/_home/{$language}/sign-in",
		select: (result) => result.authenticationOptions,
	});

	const [username, setUsername] = useState("");

	const usernameFieldId = `username-field-${id}`;

	const callGenerateAuthenticationOptions = useServerFn(generateAuthenticationOptions);
	const callVerifyAuthentication = useServerFn(verifyAuthentication);

	const encodeGenerateAuthenticationOptionsPayload = Schema.encodeSync(GenerateAuthenticationOptionsPayload);
	const encodeVerifyAuthenticationPayload = Schema.encodeSync(VerifyAuthenticationPayload);

	useEffect(() => {
		const abortController = new AbortController();

		void (async () => {
			const authenticationResponse = await startAuthentication({
				optionsJSON: authenticationOptions,
				useBrowserAutofill: true,
			});

			if (abortController.signal.aborted) {
				return;
			}

			await callVerifyAuthentication({ data: encodeVerifyAuthenticationPayload({ authenticationResponse }) });
		})();

		return () => {
			abortController.abort();
		};
	}, [authenticationOptions, callVerifyAuthentication, encodeVerifyAuthenticationPayload]);

	return (
		<div>
			<h1>
				<Trans>Sign in page</Trans>
			</h1>
			<form
				onSubmit={async (event) => {
					event.preventDefault();

					const result = await callGenerateAuthenticationOptions({
						data: encodeGenerateAuthenticationOptionsPayload({
							username: GenerateAuthenticationOptionsPayload.fields.username.members[0].make(username),
						}),
					});

					const authenticationResponse = await startAuthentication({ optionsJSON: result.authenticationOptions });

					await callVerifyAuthentication({ data: encodeVerifyAuthenticationPayload({ authenticationResponse }) });
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
					autoComplete="username webauthn" // cspell:ignore webauthn
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
