import { Model } from "@effect/sql";
import { Schema } from "effect";

const Id = Schema.Trimmed.pipe(Schema.length(16));

export class UserModel extends Model.Class<UserModel>("@naamio/schema/User")({
	createdAt: Model.DateTimeInsertFromDate,
	email: Schema.NonEmptyTrimmedString,
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("UserId"))),
}) {}

export class SessionModel extends Model.Class<SessionModel>("@naamio/schema/Session")({
	createdAt: Model.DateTimeInsertFromDate,
	deviceLabel: Schema.NonEmptyTrimmedString,
	expiresAt: Model.DateTimeFromDate,
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("SessionId"))),
	revokedAt: Model.FieldOption(Model.DateTimeFromDate),
	signature: Schema.NonEmptyTrimmedString.pipe(Schema.Redacted),
	userId: UserModel.fields.id,
}) {}

export class EmailChallengeModel extends Model.Class<EmailChallengeModel>("@naamio/schema/EmailChallenge")({
	createdAt: Model.DateTimeInsertFromDate,
	email: UserModel.fields.email,
	expiresAt: Model.DateTimeFromDate,
	hash: Schema.NonEmptyTrimmedString.pipe(Schema.Redacted),
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("EmailChallengeId"))),
	revokedAt: Model.FieldOption(Model.DateTimeFromDate),
	state: Schema.Trimmed.pipe(Schema.length(32), Schema.Redacted),
}) {}
