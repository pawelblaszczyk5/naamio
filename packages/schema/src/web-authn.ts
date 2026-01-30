import { Schema } from "effect";

export const PublicKeyCredentialRpEntity = Schema.Struct({
	id: Schema.String.pipe(Schema.optionalWith({ exact: true })),
	name: Schema.String,
});

export const PublicKeyCredentialType = Schema.Literal("public-key");

export const PublicKeyCredentialParameters = Schema.Struct({ alg: Schema.Number, type: PublicKeyCredentialType });

export const AuthenticatorTransport = Schema.Literal("ble", "cable", "hybrid", "internal", "nfc", "smart-card", "usb");

export const PublicKeyCredentialDescriptor = Schema.Struct({
	id: Schema.String,
	transports: Schema.Array(AuthenticatorTransport).pipe(Schema.mutable, Schema.optionalWith({ exact: true })),
	type: PublicKeyCredentialType,
});

export const AuthenticatorAttachment = Schema.Literal("cross-platform", "platform");

export const ResidentKeyRequirement = Schema.Literal("discouraged", "preferred", "required");

export const UserVerificationRequirement = Schema.Literal("discouraged", "preferred", "required");

export const AuthenticatorSelectionCriteria = Schema.Struct({
	authenticatorAttachment: AuthenticatorAttachment.pipe(Schema.optionalWith({ exact: true })),
	requireResidentKey: Schema.Boolean.pipe(Schema.optionalWith({ exact: true })),
	residentKey: ResidentKeyRequirement.pipe(Schema.optionalWith({ exact: true })),
	userVerification: UserVerificationRequirement.pipe(Schema.optionalWith({ exact: true })),
});

export const PublicKeyCredentialHint = Schema.Literal("hybrid", "security-key", "client-device");

export const AttestationConveyancePreference = Schema.Literal("direct", "enterprise", "indirect", "none");

export const AttestationFormat = Schema.Literal(
	"none",
	"fido-u2f",
	"packed",
	"android-safetynet", // cspell:disable-line
	"android-key",
	"tpm",
	"apple",
);

export const AuthenticationExtensionsClientInputs = Schema.Struct({
	appid: Schema.String.pipe(Schema.optionalWith({ exact: true })),
	credProps: Schema.Boolean.pipe(Schema.optionalWith({ exact: true })),
	hmacCreateSecret: Schema.Boolean.pipe(Schema.optionalWith({ exact: true })),
	minPinLength: Schema.Boolean.pipe(Schema.optionalWith({ exact: true })),
});

export const PublicKeyCredentialUserEntity = Schema.Struct({
	displayName: Schema.String,
	id: Schema.String,
	name: Schema.String,
});

export const AuthenticatorAttestationResponse = Schema.Struct({
	attestationObject: Schema.String,
	authenticatorData: Schema.String.pipe(Schema.optionalWith({ exact: true })),
	clientDataJSON: Schema.String,
	publicKey: Schema.String.pipe(Schema.optionalWith({ exact: true })),
	publicKeyAlgorithm: Schema.Number.pipe(Schema.optionalWith({ exact: true })),
	transports: Schema.Array(AuthenticatorTransport).pipe(Schema.mutable, Schema.optionalWith({ exact: true })),
});

export const CredentialPropertiesOutput = Schema.Struct({
	rk: Schema.Boolean.pipe(Schema.optionalWith({ exact: true })),
});

export const AuthenticationExtensionsClientOutputs = Schema.Struct({
	appid: Schema.Boolean.pipe(Schema.optionalWith({ exact: true })),
	credProps: CredentialPropertiesOutput.pipe(Schema.optionalWith({ exact: true })),
	hmacCreateSecret: Schema.Boolean.pipe(Schema.optionalWith({ exact: true })),
});

export const AuthenticatorAssertionResponse = Schema.Struct({
	authenticatorData: Schema.String,
	clientDataJSON: Schema.String,
	signature: Schema.String,
	userHandle: Schema.String.pipe(Schema.optionalWith({ exact: true })),
});
