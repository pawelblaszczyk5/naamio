import { Schema } from "effect";

export const PublicKeyCredentialRpEntity = Schema.Struct({
	id: Schema.optionalKey(Schema.String),
	name: Schema.String,
});

export const PublicKeyCredentialType = Schema.Literal("public-key");

export const PublicKeyCredentialParameters = Schema.Struct({ alg: Schema.Number, type: PublicKeyCredentialType });

export const AuthenticatorTransport = Schema.Literals([
	"ble",
	"cable",
	"hybrid",
	"internal",
	"nfc",
	"smart-card",
	"usb",
]);

export const PublicKeyCredentialDescriptor = Schema.Struct({
	id: Schema.String,
	transports: Schema.optionalKey(Schema.Array(AuthenticatorTransport).pipe(Schema.mutable)),
	type: PublicKeyCredentialType,
});

export const AuthenticatorAttachment = Schema.Literals(["cross-platform", "platform"]);

export const ResidentKeyRequirement = Schema.Literals(["discouraged", "preferred", "required"]);

export const UserVerificationRequirement = Schema.Literals(["discouraged", "preferred", "required"]);

export const AuthenticatorSelectionCriteria = Schema.Struct({
	authenticatorAttachment: Schema.optionalKey(AuthenticatorAttachment),
	requireResidentKey: Schema.optionalKey(Schema.Boolean),
	residentKey: Schema.optionalKey(ResidentKeyRequirement),
	userVerification: Schema.optionalKey(UserVerificationRequirement),
});

export const PublicKeyCredentialHint = Schema.Literals(["hybrid", "security-key", "client-device"]);

export const AttestationConveyancePreference = Schema.Literals(["direct", "enterprise", "indirect", "none"]);

export const AttestationFormat = Schema.Literals([
	"none",
	"fido-u2f",
	"packed",
	"android-safetynet", // cspell:disable-line
	"android-key",
	"tpm",
	"apple",
]);

export const AuthenticationExtensionsClientInputs = Schema.Struct({
	appid: Schema.optionalKey(Schema.String),
	credProps: Schema.optionalKey(Schema.Boolean),
	hmacCreateSecret: Schema.optionalKey(Schema.Boolean),
	minPinLength: Schema.optionalKey(Schema.Boolean),
});

export const PublicKeyCredentialUserEntity = Schema.Struct({
	displayName: Schema.String,
	id: Schema.String,
	name: Schema.String,
});

export const AuthenticatorAttestationResponse = Schema.Struct({
	attestationObject: Schema.String,
	authenticatorData: Schema.optionalKey(Schema.String),
	clientDataJSON: Schema.String,
	publicKey: Schema.optionalKey(Schema.String),
	publicKeyAlgorithm: Schema.optionalKey(Schema.Number),
	transports: Schema.optionalKey(Schema.Array(AuthenticatorTransport).pipe(Schema.mutable)),
});

export const CredentialPropertiesOutput = Schema.Struct({ rk: Schema.optionalKey(Schema.Boolean) });

export const AuthenticationExtensionsClientOutputs = Schema.Struct({
	appid: Schema.optionalKey(Schema.Boolean),
	credProps: Schema.optionalKey(CredentialPropertiesOutput),
	hmacCreateSecret: Schema.optionalKey(Schema.Boolean),
});

export const AuthenticatorAssertionResponse = Schema.Struct({
	authenticatorData: Schema.String,
	clientDataJSON: Schema.String,
	signature: Schema.String,
	userHandle: Schema.optionalKey(Schema.String),
});
