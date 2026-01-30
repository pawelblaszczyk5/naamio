import { HttpApiEndpoint, HttpApiError, HttpApiGroup, OpenApi } from "@effect/platform";
import { Schema } from "effect";

import {
	WebAuthnAuthenticationOptions,
	WebAuthnAuthenticationResponse,
	WebAuthnRegistrationOptions,
	WebAuthnRegistrationResponse,
} from "@naamio/schema/api";
import {
	SessionModel,
	UserModel,
	WebAuthnAuthenticationChallengeModel,
	WebAuthnRegistrationChallengeModel,
} from "@naamio/schema/domain";

const SessionCreationResponse = Schema.extend(SessionModel.json.pick("expiresAt"))(
	Schema.Struct({ token: Schema.NonEmptyTrimmedString.pipe(Schema.Redacted) }),
);

export class WebAuthn extends HttpApiGroup.make("WebAuthn")
	.add(
		HttpApiEndpoint.post("generateRegistrationOptions", "/registration/generate")
			.setPayload(
				Schema.extend(
					UserModel.jsonCreate.pick("username", "language"),
					WebAuthnRegistrationChallengeModel.jsonCreate.pick("displayName"),
				),
			)
			.addSuccess(
				Schema.Struct({
					challengeId: WebAuthnRegistrationChallengeModel.json.fields.id,
					expiresAt: WebAuthnRegistrationChallengeModel.json.fields.expiresAt,
					registrationOptions: WebAuthnRegistrationOptions,
				}),
			)
			.addError(HttpApiError.Conflict)
			.annotateContext(
				OpenApi.annotations({
					description:
						"Allows to initialize new WebAuthn registration ceremony for completely new user. It requires providing initial user data, which will be used to create user entity. It results in challengeId which should be later on passed to match the verification request and registrationOptions which can be used on the client to continue the ceremony.",
					summary: "Start WebAuthn registration ceremony.",
				}),
			),
	)
	.add(
		HttpApiEndpoint.post("verifyRegistration", "/registration/verify")
			.setPayload(
				Schema.Struct({
					challengeId: WebAuthnRegistrationChallengeModel.json.fields.id,
					deviceLabel: SessionModel.jsonCreate.fields.deviceLabel,
					registrationResponse: WebAuthnRegistrationResponse,
				}),
			)
			.addSuccess(SessionCreationResponse)
			.addError(HttpApiError.Gone)
			.addError(HttpApiError.BadRequest)
			.annotateContext(
				OpenApi.annotations({
					description:
						"Performs a verification of WebAuthn registration response from the client. It requires passing previously generated challengeId to match the ceremony. After successfully verifying it mints a new session and marks user as confirmed.",
					summary: "Verify WebAuthn registration response.",
				}),
			),
	)
	.add(
		HttpApiEndpoint.post("generateAuthenticationOptions", "/authentication/generate")
			.setPayload(
				Schema.Struct({
					username: UserModel.json.fields.username.pipe(Schema.optionalWith({ as: "Option", exact: true })),
				}),
			)
			.addSuccess(
				Schema.Struct({
					authenticationOptions: WebAuthnAuthenticationOptions,
					challengeId: WebAuthnAuthenticationChallengeModel.json.fields.id,
					expiresAt: WebAuthnAuthenticationChallengeModel.json.fields.expiresAt,
				}),
			)
			.addError(HttpApiError.NotFound)
			.annotateContext(
				OpenApi.annotations({
					description:
						"Allows to initialize new WebAuthn authentication ceremony for previously registered user. It supports two flows. Conditional UI - not passing username and allowing user to authenticate with any valid passkey. Standard username flow - allows filtering allowed credentials by username and helps user select proper passkey from the UI. It results in challengeId which should be later on passed to match the verification request and authenticationOptions which can be used on the client to continue the ceremony.",
					summary: "Start WebAuthn authentication ceremony.",
				}),
			),
	)
	.add(
		HttpApiEndpoint.post("verifyAuthentication", "/authentication/verify")
			.setPayload(
				Schema.Struct({
					authenticationResponse: WebAuthnAuthenticationResponse,
					challengeId: WebAuthnAuthenticationChallengeModel.json.fields.id,
					deviceLabel: SessionModel.jsonCreate.fields.deviceLabel,
				}),
			)
			.addSuccess(SessionCreationResponse)
			.addError(HttpApiError.NotFound)
			.addError(HttpApiError.Gone)
			.addError(HttpApiError.BadRequest)
			.annotateContext(
				OpenApi.annotations({
					description:
						"Performs a verification of WebAuthn authentication response from the client. It requires passing previously generated challengeId to match the ceremony. After successfully verifying it mints a new session.",
					summary: "Verify WebAuthn authentication response.",
				}),
			),
	)
	.prefix("/web-authn")
	.annotateContext(OpenApi.annotations({ description: "Everything related to WebAuthn flow of the app." })) {}
