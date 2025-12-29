import { Model } from "@effect/sql";
import { Schema } from "effect";

const PublicId = Schema.Trimmed.pipe(Schema.length(16));

export class UserModel extends Model.Class<UserModel>("@naamio/schema/User")({
	createdAt: Model.DateTimeInsertFromDate,
	email: Schema.TemplateLiteral(Schema.NonEmptyTrimmedString, "@", Schema.NonEmptyTrimmedString),
	id: Model.Generated(Schema.BigInt.pipe(Schema.brand("UserId"))),
	language: Schema.Literal("en-US", "pl-PL"),
	publicId: Model.GeneratedByApp(PublicId.pipe(Schema.brand("UserPublicId"))),
}) {}

export class SessionModel extends Model.Class<SessionModel>("@naamio/schema/Session")({
	createdAt: Model.DateTimeInsertFromDate,
	deviceLabel: Schema.NonEmptyTrimmedString.pipe(Schema.maxLength(64)),
	expiresAt: Model.DateTimeFromDate,
	id: Model.Generated(Schema.BigInt.pipe(Schema.brand("SessionId"))),
	publicId: Model.GeneratedByApp(PublicId.pipe(Schema.brand("SessionPublicId"))),
	revokedAt: Model.FieldOption(Model.DateTimeFromDate),
	signature: Schema.NonEmptyTrimmedString.pipe(Schema.Redacted),
	userId: UserModel.fields.id,
}) {}

export class EmailChallengeModel extends Model.Class<EmailChallengeModel>("@naamio/schema/EmailChallenge")({
	consumedAt: Model.FieldOption(Model.DateTimeFromDate),
	createdAt: Model.DateTimeInsertFromDate,
	email: UserModel.fields.email,
	expiresAt: Model.DateTimeFromDate,
	hash: Schema.NonEmptyTrimmedString.pipe(Schema.Redacted),
	id: Model.Generated(Schema.BigInt.pipe(Schema.brand("EmailChallengeId"))),
	language: UserModel.fields.language,
	refreshAvailableAt: Model.DateTimeFromDate,
	remainingAttempts: Schema.Int.pipe(Schema.between(0, 3)),
	revokedAt: Model.FieldOption(Model.DateTimeFromDate),
	state: Schema.Trimmed.pipe(Schema.length(32), Schema.Redacted),
}) {}
