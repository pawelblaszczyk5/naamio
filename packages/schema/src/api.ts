import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { Schema } from "effect";

import {
	AttestationConveyancePreference,
	AttestationFormat,
	AuthenticationExtensionsClientInputs,
	AuthenticationExtensionsClientOutputs,
	AuthenticatorAssertionResponse,
	AuthenticatorAttachment,
	AuthenticatorAttestationResponse,
	AuthenticatorSelectionCriteria,
	PublicKeyCredentialDescriptor,
	PublicKeyCredentialHint,
	PublicKeyCredentialParameters,
	PublicKeyCredentialRpEntity,
	PublicKeyCredentialType,
	PublicKeyCredentialUserEntity,
	UserVerificationRequirement,
} from "#src/web-authn.js";

export const ElectricProtocolUrlParams = Schema.Record({
	key: Schema.Literal(...ELECTRIC_PROTOCOL_QUERY_PARAMS),
	value: Schema.String,
}).pipe(Schema.partial, Schema.brand("ElectricProtocolUrlParams"));

export class WebAuthnRegistrationOptions extends Schema.Class<WebAuthnRegistrationOptions>(
	"WebAuthnRegistrationOptions",
)({
	attestation: AttestationConveyancePreference.pipe(Schema.optionalWith({ exact: true })),
	attestationFormats: Schema.Array(AttestationFormat).pipe(Schema.optionalWith({ exact: true })),
	authenticatorSelection: AuthenticatorSelectionCriteria.pipe(Schema.optionalWith({ exact: true })),
	challenge: Schema.String,
	excludeCredentials: Schema.Array(PublicKeyCredentialDescriptor).pipe(Schema.optionalWith({ exact: true })),
	extensions: AuthenticationExtensionsClientInputs.pipe(Schema.optionalWith({ exact: true })),
	hints: Schema.Array(PublicKeyCredentialHint).pipe(Schema.optionalWith({ exact: true })),
	pubKeyCredParams: Schema.Array(PublicKeyCredentialParameters).pipe(Schema.optionalWith({ exact: true })),
	rp: PublicKeyCredentialRpEntity,
	timeout: Schema.Number.pipe(Schema.optionalWith({ exact: true })),
	user: PublicKeyCredentialUserEntity,
}) {}

export class WebAuthnRegistrationResponse extends Schema.Class<WebAuthnRegistrationResponse>(
	"WebAuthnRegistrationResponse",
)({
	authenticatorAttachment: AuthenticatorAttachment.pipe(Schema.optionalWith({ exact: true })),
	clientExtensionResults: AuthenticationExtensionsClientOutputs,
	id: Schema.String,
	rawId: Schema.String,
	response: AuthenticatorAttestationResponse,
	type: PublicKeyCredentialType,
}) {}

export class WebAuthnAuthenticationOptions extends Schema.Class<WebAuthnAuthenticationOptions>(
	"WebAuthnAuthenticationOptions",
)({
	allowCredentials: Schema.Array(PublicKeyCredentialDescriptor).pipe(Schema.optionalWith({ exact: true })),
	challenge: Schema.String,
	extensions: AuthenticationExtensionsClientInputs.pipe(Schema.optionalWith({ exact: true })),
	hints: Schema.Array(PublicKeyCredentialHint).pipe(Schema.optionalWith({ exact: true })),
	rpId: PublicKeyCredentialRpEntity.fields.id,
	timeout: Schema.Number.pipe(Schema.optionalWith({ exact: true })),
	userVerification: UserVerificationRequirement.pipe(Schema.optionalWith({ exact: true })),
}) {}

export class WebAuthnAuthenticationResponse extends Schema.Class<WebAuthnAuthenticationResponse>(
	"WebAuthnAuthenticationResponse",
)({
	authenticatorAttachment: AuthenticatorAttachment.pipe(Schema.optionalWith({ exact: true })),
	clientExtensionResults: AuthenticationExtensionsClientOutputs,
	id: Schema.String,
	rawId: Schema.String,
	response: AuthenticatorAssertionResponse,
	type: PublicKeyCredentialType,
}) {}
