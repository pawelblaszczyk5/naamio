import { Schema, Struct } from "effect";
import { HttpApiEndpoint, HttpApiError, HttpApiGroup, OpenApi } from "effect/unstable/httpapi";

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
import { UnsafeEncodableRedactedFromValue } from "@naamio/schema/utilities";

const SessionCreationResponse = SessionModel.json
	.mapFields(Struct.pick(["expiresAt"]))
	.pipe(
		Schema.fieldsAssign({ token: Schema.Trimmed.check(Schema.isNonEmpty()).pipe(UnsafeEncodableRedactedFromValue) }),
	);

export class WebAuthn extends HttpApiGroup.make("WebAuthn")
	.add(
		HttpApiEndpoint.post("generateRegistrationOptions", "/registration/generate", {
			error: HttpApiError.Conflict,
			payload: UserModel.jsonCreate
				.mapFields(Struct.pick(["username", "language"]))
				.pipe(Schema.fieldsAssign({ displayName: WebAuthnRegistrationChallengeModel.jsonCreate.fields.displayName })),
			success: Schema.Struct({
				challengeId: WebAuthnRegistrationChallengeModel.json.fields.id,
				expiresAt: WebAuthnRegistrationChallengeModel.json.fields.expiresAt,
				registrationOptions: WebAuthnRegistrationOptions,
			}),
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Allows to initialize new WebAuthn registration ceremony for completely new user. It requires providing initial user data, which will be used to create user entity. It results in challengeId which should be later on passed to match the verification request and registrationOptions which can be used on the client to continue the ceremony.",
				summary: "Start WebAuthn registration ceremony.",
			}),
		),
	)
	.add(
		HttpApiEndpoint.post("verifyRegistration", "/registration/verify", {
			error: [HttpApiError.Gone, HttpApiError.BadRequest],
			payload: Schema.Struct({
				challengeId: WebAuthnRegistrationChallengeModel.json.fields.id,
				deviceLabel: SessionModel.jsonCreate.fields.deviceLabel,
				registrationResponse: WebAuthnRegistrationResponse,
			}),
			success: SessionCreationResponse,
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Performs a verification of WebAuthn registration response from the client. It requires passing previously generated challengeId to match the ceremony. After successfully verifying it mints a new session and marks user as confirmed.",
				summary: "Verify WebAuthn registration response.",
			}),
		),
	)
	.add(
		HttpApiEndpoint.post("generateAuthenticationOptions", "/authentication/generate", {
			error: HttpApiError.NotFound,
			payload: Schema.Struct({ username: Schema.OptionFromOptionalKey(UserModel.json.fields.username) }),
			success: Schema.Struct({
				authenticationOptions: WebAuthnAuthenticationOptions,
				challengeId: WebAuthnAuthenticationChallengeModel.json.fields.id,
				expiresAt: WebAuthnAuthenticationChallengeModel.json.fields.expiresAt,
			}),
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Allows to initialize new WebAuthn authentication ceremony for previously registered user. It supports two flows. Conditional UI - not passing username and allowing user to authenticate with any valid passkey. Standard username flow - allows filtering allowed credentials by username and helps user select proper passkey from the UI. It results in challengeId which should be later on passed to match the verification request and authenticationOptions which can be used on the client to continue the ceremony.",
				summary: "Start WebAuthn authentication ceremony.",
			}),
		),
	)
	.add(
		HttpApiEndpoint.post("verifyAuthentication", "/authentication/verify", {
			error: [HttpApiError.NotFound, HttpApiError.Gone, HttpApiError.BadRequest],
			payload: Schema.Struct({
				authenticationResponse: WebAuthnAuthenticationResponse,
				challengeId: WebAuthnAuthenticationChallengeModel.json.fields.id,
				deviceLabel: SessionModel.jsonCreate.fields.deviceLabel,
			}),
			success: SessionCreationResponse,
		}).annotateMerge(
			OpenApi.annotations({
				description:
					"Performs a verification of WebAuthn authentication response from the client. It requires passing previously generated challengeId to match the ceremony. After successfully verifying it mints a new session.",
				summary: "Verify WebAuthn authentication response.",
			}),
		),
	)
	.prefix("/web-authn")
	.annotateMerge(OpenApi.annotations({ description: "Everything related to WebAuthn flow of the app." })) {}
