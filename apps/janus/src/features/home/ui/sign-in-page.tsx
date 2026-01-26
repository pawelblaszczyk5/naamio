import { Trans } from "@lingui/react/macro";
import { useLoaderData, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Match } from "effect";
import { useId, useState } from "react";

import { assert } from "@naamio/assert";
import stylex from "@naamio/stylex";

import { initializeAuthenticationChallenge, solveAuthenticationChallenge } from "#src/features/home/procedures/mod.js";
import { useLanguage } from "#src/lib/i18n/use-language.js";

const initializeFormStyles = stylex.create({
	form: { alignItems: "flex-start", display: "flex", flexDirection: "column", gap: 8 },
	input: { borderColor: "black", borderStyle: "solid", borderWidth: 1 },
});

const InitializeForm = () => {
	const id = useId();
	const router = useRouter();
	const callInitializeAuthenticationChallenge = useServerFn(initializeAuthenticationChallenge);
	const language = useLanguage();

	const [email, setEmail] = useState("");

	const emailFieldId = `email-field-${id}`;

	return (
		<form
			onSubmit={async (event) => {
				event.preventDefault();

				await callInitializeAuthenticationChallenge({ data: { email: email as never, language } });

				void router.invalidate();
			}}
			method="POST"
			{...stylex.props(initializeFormStyles.form)}
		>
			<label htmlFor={emailFieldId}>
				<Trans>Email</Trans>
			</label>
			<input
				onChange={(event) => {
					setEmail(event.currentTarget.value);
				}}
				id={emailFieldId}
				type="email"
				value={email}
				required
				{...stylex.props(initializeFormStyles.input)}
			/>
			<button type="submit">
				<Trans>Start challenge</Trans>
			</button>
		</form>
	);
};

const completeFormStyles = stylex.create({
	form: { alignItems: "flex-start", display: "flex", flexDirection: "column", gap: 8 },
});

const CompleteForm = () => {
	const id = useId();
	const router = useRouter();
	const authenticationChallengeMetadata = useLoaderData({ from: "/_home/{$language}/sign-in" });
	const callSolveAuthenticationChallenge = useServerFn(solveAuthenticationChallenge);

	assert(authenticationChallengeMetadata, "Complete form should only be rendered when challenge is started");

	const [code, setCode] = useState("");

	const codeFieldId = `code-field-${id}`;

	return (
		<form
			onSubmit={async (event) => {
				event.preventDefault();

				await callSolveAuthenticationChallenge({ data: { code } });

				void router.invalidate();
			}}
			{...stylex.props(completeFormStyles.form)}
		>
			<label htmlFor={codeFieldId}>
				<Trans>OTP</Trans>
			</label>
			<input
				onChange={(event) => {
					setCode(event.currentTarget.value);
				}}
				autoComplete="one-time-code"
				id={codeFieldId}
				maxLength={6}
				minLength={6}
				type="text"
				value={code}
				required
				{...stylex.props(initializeFormStyles.input)}
			/>
			<button type="submit">
				<Trans>Complete challenge</Trans>
			</button>
		</form>
	);
};

export const SignInPage = () => {
	const authenticationChallengeMetadata = useLoaderData({ from: "/_home/{$language}/sign-in" });

	const hasChallenge = Boolean(authenticationChallengeMetadata);

	return (
		<div>
			<h1>
				<Trans>Sign in page</Trans>
			</h1>
			{Match.value(hasChallenge).pipe(
				Match.when(false, () => <InitializeForm />),
				Match.when(true, () => <CompleteForm />),
				Match.exhaustive,
			)}
		</div>
	);
};
