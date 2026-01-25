import { Model } from "@effect/sql";
import { Redacted, Schema } from "effect";

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
	createdAt: Model.DateTimeInsertFromDate,
	email: Schema.TemplateLiteral(Schema.String, "@", Schema.String).pipe(
		Schema.annotations({ examples: ["test@example.com"], jsonSchema: { format: "email" } }),
	),
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("UserId"))),
	language: Schema.Literal("en-US", "pl-PL"),
}) {}

export class SessionModel extends Model.Class<SessionModel>("@naamio/schema/SessionModel")({
	createdAt: Model.DateTimeInsertFromDate,
	deviceLabel: Model.FieldOption(Schema.NonEmptyTrimmedString.pipe(Schema.maxLength(64))),
	expiresAt: DateTimeFromDate,
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("SessionId"))),
	revokedAt: Model.FieldOption(DateTimeFromDate),
	signature: Schema.NonEmptyTrimmedString.pipe(Schema.Redacted),
	userId: UserModel.fields.id,
}) {}

export class EmailChallengeModel extends Model.Class<EmailChallengeModel>("@naamio/schema/EmailChallengeModel")({
	consumedAt: Model.FieldOption(DateTimeFromDate),
	createdAt: Model.DateTimeInsertFromDate,
	email: UserModel.fields.email,
	expiresAt: DateTimeFromDate,
	hash: Schema.NonEmptyTrimmedString.pipe(Schema.Redacted),
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("EmailChallengeId"))),
	language: UserModel.fields.language,
	refreshAvailableAt: DateTimeFromDate,
	remainingAttempts: Schema.Int.pipe(Schema.between(0, 3)),
	revokedAt: Model.FieldOption(DateTimeFromDate),
	state: Schema.Trimmed.pipe(Schema.length(32), Schema.Redacted),
}) {}

export const EmailChallengeCode = Schema.Trimmed.pipe(
	Schema.length(6),
	Schema.Redacted,
	Schema.annotations({ examples: [Redacted.make("012345")] }),
);

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
	role: Schema.Literal("USER"),
}) {}

export class AgentMessageModel extends Model.Class<AgentMessageModel>("@naamio/schema/AgentMessageModel")({
	...BaseMessageFields,
	id: AgentMessageId,
	parentId: UserMessageId,
	role: Schema.Literal("AGENT"),
	status: Schema.Literal("IN_PROGRESS", "STOPPED", "FINISHED", "ERROR"),
}) {}

const BaseMessagePartFields = { createdAt: Model.DateTimeInsertFromDate };

const SharedMessageId = Schema.Union(UserMessageId, AgentMessageId);

export class TextMessagePartModel extends Model.Class<TextMessagePartModel>("@naamio/schema/TextMessagePartModel")({
	...BaseMessagePartFields,
	data: Schema.Struct({ text: Schema.String }),
	id: Id.pipe(Schema.brand("TextMessagePartId")),
	messageId: SharedMessageId,
	type: Schema.Literal("TEXT"),
	userId: UserModel.fields.id,
}) {}
