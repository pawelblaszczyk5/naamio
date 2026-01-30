import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { Option, Schema } from "effect";

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

const compat = <T>(schema: Schema.Schema<T>) =>
	Schema.optionalToOptional(Schema.Union(Schema.Undefined, schema), schema, {
		decode: (option) => {
			if (Option.isNone(option)) {
				return Option.none();
			}

			const value = option.value;

			if (value === undefined) {
				return Option.none();
			}

			return Option.some(value);
		},
		encode: (option) => option,
	});

export const WebAuthnRegistrationOptions = Schema.Struct({
	attestation: AttestationConveyancePreference.pipe(compat),
	attestationFormats: Schema.Array(AttestationFormat).pipe(Schema.mutable, compat),
	authenticatorSelection: AuthenticatorSelectionCriteria.pipe(compat),
	challenge: Schema.String,
	excludeCredentials: Schema.Array(PublicKeyCredentialDescriptor).pipe(Schema.mutable, compat),
	extensions: AuthenticationExtensionsClientInputs.pipe(compat),
	hints: Schema.Array(PublicKeyCredentialHint).pipe(Schema.mutable, compat),
	pubKeyCredParams: Schema.Array(PublicKeyCredentialParameters).pipe(Schema.mutable),
	rp: PublicKeyCredentialRpEntity,
	timeout: Schema.Number.pipe(compat),
	user: PublicKeyCredentialUserEntity,
});

export type WebAuthnRegistrationOptions = (typeof WebAuthnRegistrationOptions)["Type"];

export const WebAuthnRegistrationResponse = Schema.Struct({
	authenticatorAttachment: AuthenticatorAttachment.pipe(compat),
	clientExtensionResults: AuthenticationExtensionsClientOutputs,
	id: Schema.String,
	rawId: Schema.String,
	response: AuthenticatorAttestationResponse,
	type: PublicKeyCredentialType,
});

export type WebAuthnRegistrationResponse = (typeof WebAuthnRegistrationResponse)["Type"];

export const WebAuthnAuthenticationOptions = Schema.Struct({
	allowCredentials: Schema.Array(PublicKeyCredentialDescriptor).pipe(Schema.mutable, compat),
	challenge: Schema.String,
	extensions: AuthenticationExtensionsClientInputs.pipe(compat),
	hints: Schema.Array(PublicKeyCredentialHint).pipe(Schema.mutable, compat),
	rpId: PublicKeyCredentialRpEntity.fields.id,
	timeout: Schema.Number.pipe(compat),
	userVerification: UserVerificationRequirement.pipe(compat),
});

export type WebAuthnAuthenticationOptions = (typeof WebAuthnAuthenticationOptions)["Type"];

export const WebAuthnAuthenticationResponse = Schema.Struct({
	authenticatorAttachment: AuthenticatorAttachment.pipe(compat),
	clientExtensionResults: AuthenticationExtensionsClientOutputs,
	id: Schema.String,
	rawId: Schema.String,
	response: AuthenticatorAssertionResponse,
	type: PublicKeyCredentialType,
});

export type WebAuthnAuthenticationResponse = (typeof WebAuthnAuthenticationResponse)["Type"];
