import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { Schema } from "effect";

import { optionalWithExactOptionalPropertyKeysCompat } from "#src/utilities.js";
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

export const ElectricProtocolQuery = Object.fromEntries(
	ELECTRIC_PROTOCOL_QUERY_PARAMS.map((key) => [key, Schema.optionalKey(Schema.String)]),
);

export type ElectricProtocolQuery = Record<string, string | undefined>;

export const WebAuthnRegistrationOptions = Schema.Struct({
	attestation: AttestationConveyancePreference.pipe(optionalWithExactOptionalPropertyKeysCompat),
	attestationFormats: Schema.Array(AttestationFormat).pipe(Schema.mutable, optionalWithExactOptionalPropertyKeysCompat),
	authenticatorSelection: AuthenticatorSelectionCriteria.pipe(optionalWithExactOptionalPropertyKeysCompat),
	challenge: Schema.String,
	excludeCredentials: Schema.Array(PublicKeyCredentialDescriptor).pipe(
		Schema.mutable,
		optionalWithExactOptionalPropertyKeysCompat,
	),
	extensions: AuthenticationExtensionsClientInputs.pipe(optionalWithExactOptionalPropertyKeysCompat),
	hints: Schema.Array(PublicKeyCredentialHint).pipe(Schema.mutable, optionalWithExactOptionalPropertyKeysCompat),
	pubKeyCredParams: Schema.Array(PublicKeyCredentialParameters).pipe(Schema.mutable),
	rp: PublicKeyCredentialRpEntity,
	timeout: Schema.Number.pipe(optionalWithExactOptionalPropertyKeysCompat),
	user: PublicKeyCredentialUserEntity,
});

export type WebAuthnRegistrationOptions = (typeof WebAuthnRegistrationOptions)["Type"];

export const WebAuthnRegistrationResponse = Schema.Struct({
	authenticatorAttachment: AuthenticatorAttachment.pipe(optionalWithExactOptionalPropertyKeysCompat),
	clientExtensionResults: AuthenticationExtensionsClientOutputs,
	id: Schema.String,
	rawId: Schema.String,
	response: AuthenticatorAttestationResponse,
	type: PublicKeyCredentialType,
});

export type WebAuthnRegistrationResponse = (typeof WebAuthnRegistrationResponse)["Type"];

export const WebAuthnAuthenticationOptions = Schema.Struct({
	allowCredentials: Schema.Array(PublicKeyCredentialDescriptor).pipe(
		Schema.mutable,
		optionalWithExactOptionalPropertyKeysCompat,
	),
	challenge: Schema.String,
	extensions: AuthenticationExtensionsClientInputs.pipe(optionalWithExactOptionalPropertyKeysCompat),
	hints: Schema.Array(PublicKeyCredentialHint).pipe(Schema.mutable, optionalWithExactOptionalPropertyKeysCompat),
	rpId: PublicKeyCredentialRpEntity.fields.id,
	timeout: Schema.Number.pipe(optionalWithExactOptionalPropertyKeysCompat),
	userVerification: UserVerificationRequirement.pipe(optionalWithExactOptionalPropertyKeysCompat),
});

export type WebAuthnAuthenticationOptions = (typeof WebAuthnAuthenticationOptions)["Type"];

export const WebAuthnAuthenticationResponse = Schema.Struct({
	authenticatorAttachment: AuthenticatorAttachment.pipe(optionalWithExactOptionalPropertyKeysCompat),
	clientExtensionResults: AuthenticationExtensionsClientOutputs,
	id: Schema.String,
	rawId: Schema.String,
	response: AuthenticatorAssertionResponse,
	type: PublicKeyCredentialType,
});

export type WebAuthnAuthenticationResponse = (typeof WebAuthnAuthenticationResponse)["Type"];
