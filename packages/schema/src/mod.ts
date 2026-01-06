import { Model } from "@effect/sql";
import { Redacted, Schema } from "effect";

const PublicId = Schema.Trimmed.pipe(Schema.length(16));

const DateTimeFromDate = Model.Field({
	insert: Model.DateTimeFromDate,
	json: Schema.DateTimeUtc,
	jsonCreate: Schema.DateTimeUtc,
	jsonUpdate: Schema.DateTimeUtc,
	select: Model.DateTimeFromDate,
	update: Model.DateTimeFromDate,
});

export class UserModel extends Model.Class<UserModel>("@naamio/schema/User")({
	createdAt: Model.DateTimeInsertFromDate,
	email: Schema.TemplateLiteral(Schema.String, "@", Schema.String).pipe(
		Schema.annotations({ examples: ["test@example.com"], jsonSchema: { format: "email" } }),
	),
	id: Model.Generated(Schema.BigInt.pipe(Schema.brand("UserId"))),
	language: Schema.Literal("en-US", "pl-PL"),
	publicId: Model.GeneratedByApp(PublicId.pipe(Schema.brand("UserPublicId"))),
}) {}

export class SessionModel extends Model.Class<SessionModel>("@naamio/schema/Session")({
	createdAt: Model.DateTimeInsertFromDate,
	deviceLabel: Model.FieldOption(Schema.NonEmptyTrimmedString.pipe(Schema.maxLength(64))),
	expiresAt: DateTimeFromDate,
	id: Model.Generated(Schema.BigInt.pipe(Schema.brand("SessionId"))),
	publicId: Model.GeneratedByApp(PublicId.pipe(Schema.brand("SessionPublicId"))),
	revokedAt: Model.FieldOption(DateTimeFromDate),
	signature: Schema.NonEmptyTrimmedString.pipe(Schema.Redacted),
	userId: UserModel.fields.id,
}) {}

export class EmailChallengeModel extends Model.Class<EmailChallengeModel>("@naamio/schema/EmailChallenge")({
	consumedAt: Model.FieldOption(DateTimeFromDate),
	createdAt: Model.DateTimeInsertFromDate,
	email: UserModel.fields.email,
	expiresAt: DateTimeFromDate,
	hash: Schema.NonEmptyTrimmedString.pipe(Schema.Redacted),
	id: Model.Generated(Schema.BigInt.pipe(Schema.brand("EmailChallengeId"))),
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
