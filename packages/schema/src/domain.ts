import { Schema, SchemaTransformation } from "effect";
import { Model } from "effect/unstable/schema";

import { ArrayFromString, unsafeEncodableRedactedFromValue } from "#src/utilities.js";
import { AuthenticatorTransport } from "#src/web-authn.js";

export const TransactionId = Schema.NumberFromString.pipe(Schema.brand("TransactionId"));

export type TransactionId = (typeof TransactionId)["Type"];

const Id = Schema.Trimmed.check(Schema.isNonEmpty());

const DateTimeFromDate = Model.Field({
	insert: Schema.DateTimeUtcFromDate,
	json: Schema.DateTimeUtcFromString,
	jsonCreate: Schema.DateTimeUtcFromString,
	jsonUpdate: Schema.DateTimeUtcFromString,
	select: Schema.DateTimeUtcFromDate,
	update: Schema.DateTimeUtcFromDate,
});

export class UserModel extends Model.Class<UserModel>("@naamio/schema/UserModel")({
	confirmedAt: Model.FieldOption(DateTimeFromDate),
	createdAt: Model.DateTimeInsertFromDate,
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("UserId"))),
	language: Schema.Literals(["en-US", "pl-PL"]),
	username: Schema.String.check(Schema.isLengthBetween(5, 24)).pipe(Schema.brand("Username")),
	webAuthnId: Model.GeneratedByApp(Id.pipe(Schema.brand("WebAuthnId"))),
}) {}

export class PasskeyModel extends Model.Class<PasskeyModel>("@naamio/schema/PasskeyModel")({
	aaguid: Schema.String.pipe(Schema.brand("Aaguid")),
	backedUp: Schema.Boolean,
	counter: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
	createdAt: Model.DateTimeInsertFromDate,
	credentialId: Schema.String.pipe(Schema.brand("CredentialId")),
	deviceType: Schema.Literals(["SINGLE_DEVICE", "MULTI_DEVICE"]),
	displayName: Schema.String.check(Schema.isLengthBetween(3, 50)).pipe(Schema.brand("DisplayName")),
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("PassKeyId"))),
	publicKey: Schema.String.pipe(unsafeEncodableRedactedFromValue),
	transports: Model.FieldOption(
		ArrayFromString().pipe(
			Schema.decodeTo(Schema.UniqueArray(AuthenticatorTransport), SchemaTransformation.passthroughSupertype()),
		),
	),
	userId: UserModel.select.fields.id,
}) {}

export class SessionModel extends Model.Class<SessionModel>("@naamio/schema/SessionModel")({
	createdAt: Model.DateTimeInsertFromDate,
	deviceLabel: Model.FieldOption(Schema.Trimmed.check(Schema.isNonEmpty(), Schema.isMaxLength(64))),
	expiresAt: DateTimeFromDate,
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("SessionId"))),
	passkeyId: PasskeyModel.select.fields.id,
	revokedAt: Model.FieldOption(DateTimeFromDate),
	signature: Schema.Trimmed.check(Schema.isNonEmpty()).pipe(unsafeEncodableRedactedFromValue),
	userId: UserModel.select.fields.id,
}) {}

export const WebAuthnChallengeType = Schema.Enum({
	AUTHENTICATION: "AUTHENTICATION" as const,
	REGISTRATION: "REGISTRATION" as const,
});

const BaseWebAuthnChallengeFields = { challengeValue: Schema.String, expiresAt: DateTimeFromDate };

export class WebAuthnRegistrationChallengeModel extends Model.Class<WebAuthnRegistrationChallengeModel>(
	"@naamio/schema/WebAuthnRegistrationChallengeModel",
)({
	...BaseWebAuthnChallengeFields,
	displayName: PasskeyModel.select.fields.displayName,
	id: Id.pipe(Schema.brand("WebAuthnRegistrationChallengeId")),
	type: Schema.tag(WebAuthnChallengeType.enums.REGISTRATION),
	userId: UserModel.select.fields.id,
}) {}

export class WebAuthnAuthenticationChallengeModel extends Model.Class<WebAuthnAuthenticationChallengeModel>(
	"@naamio/schema/WebAuthnAuthenticationChallengeModel",
)({
	...BaseWebAuthnChallengeFields,
	id: Id.pipe(Schema.brand("WebAuthnAuthenticationChallengeId")),
	type: Schema.tag(WebAuthnChallengeType.enums.AUTHENTICATION),
	userId: Model.FieldOption(UserModel.select.fields.id),
}) {}

export class ConversationModel extends Model.Class<ConversationModel>("@naamio/schema/ConversationModel")({
	accessedAt: DateTimeFromDate,
	createdAt: Model.DateTimeInsertFromDate,
	id: Id.pipe(Schema.brand("ConversationId")),
	title: Model.FieldOption(Schema.Trimmed.check(Schema.isLengthBetween(3, 50))),
	updatedAt: DateTimeFromDate,
	userId: UserModel.select.fields.id,
}) {}

export const MessageRole = Schema.Enum({ AGENT: "AGENT" as const, USER: "USER" as const });

export const MessageStatus = Schema.Enum({
	ERROR: "ERROR" as const,
	FINISHED: "FINISHED" as const,
	IN_PROGRESS: "IN_PROGRESS" as const,
	INTERRUPTED: "INTERRUPTED" as const,
});

const BaseMessageFields = {
	conversationId: ConversationModel.select.fields.id,
	createdAt: Model.DateTimeInsertFromDate,
	userId: UserModel.select.fields.id,
};

const UserMessageId = Id.pipe(Schema.brand("UserMessageId"));
const AgentMessageId = Id.pipe(Schema.brand("AgentMessageId"));

export class UserMessageModel extends Model.Class<UserMessageModel>("@naamio/schema/UserMessageModel")({
	...BaseMessageFields,
	id: UserMessageId,
	parentId: Model.FieldOption(AgentMessageId),
	role: Schema.tag(MessageRole.enums.USER),
}) {}

export class AgentMessageModel extends Model.Class<AgentMessageModel>("@naamio/schema/AgentMessageModel")({
	...BaseMessageFields,
	id: AgentMessageId,
	metadata: Model.FieldOption(
		Model.JsonFromString(
			Schema.Struct({
				performanceMetrics: Schema.Struct({
					processingTime: Schema.Number.check(Schema.isGreaterThan(0)),
					timeToFirstToken: Schema.Number.check(Schema.isGreaterThan(0)),
				}),
				usage: Schema.Struct({
					cachedInputTokens: Schema.Int.check(Schema.isGreaterThan(0)),
					inputTokens: Schema.Int.check(Schema.isGreaterThan(0)),
					outputTokens: Schema.Int.check(Schema.isGreaterThan(0)),
					totalTokens: Schema.Int.check(Schema.isGreaterThan(0)),
				}),
			}),
		),
	),
	parentId: UserMessageId,
	role: Schema.tag(MessageRole.enums.AGENT),
	status: MessageStatus,
}) {}

export const MessagePartType = Schema.Enum({ REASONING: "REASONING" as const, TEXT: "TEXT" as const });

const BaseMessagePartFields = { createdAt: Model.DateTimeInsertFromDate, userId: UserModel.select.fields.id };

const SharedMessageId = Schema.Union([UserMessageId, AgentMessageId]);

export class TextMessagePartModel extends Model.Class<TextMessagePartModel>("@naamio/schema/TextMessagePartModel")({
	...BaseMessagePartFields,
	data: Schema.Struct({ content: Schema.OptionFromOptionalKey(Schema.String) }),
	id: Id.pipe(Schema.brand("TextMessagePartId")),
	messageId: SharedMessageId,
	type: Schema.tag(MessagePartType.enums.TEXT),
}) {}

export class ReasoningMessagePartModel extends Model.Class<ReasoningMessagePartModel>(
	"@naamio/schema/ReasoningMessagePartModel",
)({
	...BaseMessagePartFields,
	data: Schema.Struct({ content: Schema.OptionFromOptionalKey(Schema.String) }),
	id: Id.pipe(Schema.brand("ReasoningMessagePartId")),
	messageId: AgentMessageId,
	type: Schema.tag(MessagePartType.enums.REASONING),
}) {}

export class InflightChunkModel extends Model.Class<InflightChunkModel>("@naamio/schema/InflightChunkModel")({
	content: Schema.String,
	id: Id.pipe(Schema.brand("InflightChunkId")),
	messagePartId: Schema.Union([TextMessagePartModel.select.fields.id, ReasoningMessagePartModel.select.fields.id]),
	sequence: Schema.Int.check(Schema.isGreaterThan(0)),
	userId: UserModel.select.fields.id,
}) {}
