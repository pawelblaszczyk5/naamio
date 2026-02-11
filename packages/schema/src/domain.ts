import { Model } from "@effect/sql";
import { Schema } from "effect";

import { AuthenticatorTransport } from "#src/web-authn.js";

export const TransactionId = Schema.NumberFromString.pipe(Schema.brand("TransactionId"));

export type TransactionId = (typeof TransactionId)["Type"];

const Id = Schema.Trimmed.pipe(Schema.length(16));

const DateTimeFromDate = Model.Field({
	insert: Model.DateTimeFromDate,
	json: Schema.DateTimeUtc,
	jsonCreate: Schema.DateTimeUtc,
	jsonUpdate: Schema.DateTimeUtc,
	select: Model.DateTimeFromDate,
	update: Model.DateTimeFromDate,
});

export class UserModel extends Model.Class<UserModel>("@naamio/schema/UserModel")({
	confirmedAt: Model.FieldOption(DateTimeFromDate),
	createdAt: Model.DateTimeInsertFromDate,
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("UserId"))),
	language: Schema.Literal("en-US", "pl-PL"),
	username: Schema.String.pipe(Schema.length({ max: 24, min: 5 }), Schema.brand("Username")),
	webAuthnId: Model.GeneratedByApp(Id.pipe(Schema.brand("WebAuthnId"))),
}) {}

export class PasskeyModel extends Model.Class<PasskeyModel>("@naamio/schema/PasskeyModel")({
	aaguid: Schema.String.pipe(Schema.brand("Aaguid")),
	backedUp: Schema.Boolean,
	counter: Schema.BigInt,
	createdAt: Model.DateTimeInsertFromDate,
	credentialId: Schema.String.pipe(Schema.brand("CredentialId")),
	deviceType: Schema.Literal("SINGLE_DEVICE", "MULTI_DEVICE"),
	displayName: Schema.String.pipe(Schema.length({ max: 50, min: 3 }), Schema.brand("DisplayName")),
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("PassKeyId"))),
	publicKey: Schema.String.pipe(Schema.Redacted),
	transports: Model.FieldOption(Schema.compose(Schema.split(","), Schema.Array(AuthenticatorTransport))),
	userId: UserModel.fields.id,
}) {}

export class SessionModel extends Model.Class<SessionModel>("@naamio/schema/SessionModel")({
	createdAt: Model.DateTimeInsertFromDate,
	deviceLabel: Model.FieldOption(Schema.NonEmptyTrimmedString.pipe(Schema.maxLength(64))),
	expiresAt: DateTimeFromDate,
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("SessionId"))),
	passkeyId: PasskeyModel.fields.id,
	revokedAt: Model.FieldOption(DateTimeFromDate),
	signature: Schema.NonEmptyTrimmedString.pipe(Schema.Redacted),
	userId: UserModel.fields.id,
}) {}

const BaseWebAuthnChallengeFields = { challengeValue: Schema.String, expiresAt: DateTimeFromDate };

export class WebAuthnRegistrationChallengeModel extends Model.Class<WebAuthnRegistrationChallengeModel>(
	"@naamio/schema/WebAuthnRegistrationChallengeModel",
)({
	...BaseWebAuthnChallengeFields,
	displayName: PasskeyModel.fields.displayName,
	id: Id.pipe(Schema.brand("WebAuthnRegistrationChallengeId")),
	type: Schema.tag("REGISTRATION"),
	userId: UserModel.fields.id,
}) {}

export class WebAuthnAuthenticationChallengeModel extends Model.Class<WebAuthnAuthenticationChallengeModel>(
	"@naamio/schema/WebAuthnAuthenticationChallengeModel",
)({
	...BaseWebAuthnChallengeFields,
	id: Id.pipe(Schema.brand("WebAuthnAuthenticationChallengeId")),
	type: Schema.tag("AUTHENTICATION"),
	userId: Model.FieldOption(UserModel.fields.id),
}) {}

export class ConversationModel extends Model.Class<ConversationModel>("@naamio/schema/ConversationModel")({
	createdAt: Model.DateTimeInsertFromDate,
	id: Id.pipe(Schema.brand("ConversationId")),
	title: Model.FieldOption(Schema.NonEmptyTrimmedString.pipe(Schema.length({ max: 50, min: 3 }))),
	updatedAt: DateTimeFromDate,
	userId: UserModel.fields.id,
}) {}

const BaseMessageFields = {
	conversationId: ConversationModel.fields.id,
	createdAt: Model.DateTimeInsertFromDate,
	userId: UserModel.fields.id,
};

const UserMessageId = Id.pipe(Schema.brand("UserMessageId"));
const AgentMessageId = Id.pipe(Schema.brand("AgentMessageId"));

export class UserMessageModel extends Model.Class<UserMessageModel>("@naamio/schema/UserMessageModel")({
	...BaseMessageFields,
	id: UserMessageId,
	parentId: Model.FieldOption(AgentMessageId),
	role: Schema.tag("USER"),
}) {}

export class AgentMessageModel extends Model.Class<AgentMessageModel>("@naamio/schema/AgentMessageModel")({
	...BaseMessageFields,
	id: AgentMessageId,
	parentId: UserMessageId,
	role: Schema.tag("AGENT"),
	status: Schema.Literal("IN_PROGRESS", "INTERRUPTED", "FINISHED", "ERROR"),
}) {}

const BaseMessagePartFields = { createdAt: Model.DateTimeInsertFromDate };

const SharedMessageId = Schema.Union(UserMessageId, AgentMessageId);

export class TextMessagePartModel extends Model.Class<TextMessagePartModel>("@naamio/schema/TextMessagePartModel")({
	...BaseMessagePartFields,
	data: Schema.Struct({ text: Schema.String }),
	id: Id.pipe(Schema.brand("TextMessagePartId")),
	messageId: SharedMessageId,
	type: Schema.tag("TEXT"),
	userId: UserModel.fields.id,
}) {}
