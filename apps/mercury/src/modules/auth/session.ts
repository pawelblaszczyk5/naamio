import { SqlSchema } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { Config, Context, DateTime, Duration, Effect, Layer, Option, Redacted, Schema } from "effect";
import { customAlphabet } from "nanoid";

import { generateHmacSignature, verifyHmacSignature } from "@naamio/hmac";
import { generateId } from "@naamio/id-generator/effect";
import { SessionModel } from "@naamio/schema";

import { STANDARD_ID_ALPHABET } from "#src/modules/auth/constants.js";
import { DatabaseLive } from "#src/modules/database/mod.js";

const SESSION_EXPIRATION_DURATION = Duration.days(30);

export class Session extends Context.Tag("@naamio/mercury/Session")<
	Session,
	{
		system: {
			create: (
				data: Pick<SessionModel, "deviceLabel" | "userId">,
			) => Effect.Effect<{ expiresAt: SessionModel["expiresAt"]; token: Redacted.Redacted }>;
			retrieveFromToken: (
				token: Redacted.Redacted,
			) => Effect.Effect<Option.Option<Pick<SessionModel, "id" | "userId">>>;
		};
	}
>() {
	static Live = Layer.effect(
		this,
		Effect.gen(function* () {
			const SESSION_VALUE_SECRET = yield* Config.redacted("AUTH_SESSION_VALUE_SECRET");

			const sql = yield* PgClient.PgClient;

			const generateSessionValue = customAlphabet(STANDARD_ID_ALPHABET, 32);

			const insertSession = SqlSchema.void({
				execute: (request) => sql`
					INSERT INTO
						${sql("session")} ${sql.insert(request)};
				`,
				Request: SessionModel.insert,
			});

			const findByPublicId = SqlSchema.findOne({
				execute: (request) => sql`
					SELECT
						${sql("id")},
						${sql("userId")},
						${sql("signature")},
						${sql("expiresAt")},
						${sql("revokedAt")}
					FROM
						${sql("session")}
					WHERE
						${sql("publicId")} = ${request}
				`,
				Request: SessionModel.fields.publicId,
				Result: SessionModel.select.pick("id", "userId", "signature", "expiresAt", "revokedAt"),
			});

			return {
				system: {
					create: Effect.fn("@naamio/mercury/Session#create")(function* (data) {
						const publicId = SessionModel.fields.publicId.make(yield* generateId());
						const expiresAt = yield* DateTime.now.pipe(Effect.map(DateTime.addDuration(SESSION_EXPIRATION_DURATION)));
						const value = generateSessionValue();
						const signature = yield* generateHmacSignature(value, SESSION_VALUE_SECRET);
						const token = Redacted.make(`${publicId}.${value}`);

						yield* insertSession({
							createdAt: undefined,
							deviceLabel: data.deviceLabel,
							expiresAt,
							publicId,
							revokedAt: Option.none(),
							signature,
							userId: data.userId,
						}).pipe(Effect.orDie);

						return { expiresAt, token };
					}),
					retrieveFromToken: Effect.fn("@naamio/mercury/Session#retrieveFromToken")(function* (token) {
						const unredactedToken = Redacted.value(token);
						const lastDotIndex = unredactedToken.lastIndexOf(".");
						const maybePublicId = Schema.decodeOption(SessionModel.fields.publicId)(
							unredactedToken.slice(0, lastDotIndex),
						);
						const value = unredactedToken.slice(lastDotIndex + 1);

						if (Option.isNone(maybePublicId)) {
							return Option.none();
						}

						const maybeSession = yield* findByPublicId(maybePublicId.value).pipe(Effect.orDie);

						if (Option.isNone(maybeSession)) {
							return Option.none();
						}

						const isValidValue = yield* verifyHmacSignature(value, maybeSession.value.signature, SESSION_VALUE_SECRET);

						if (!isValidValue) {
							return Option.none();
						}

						const isRevoked = Option.isSome(maybeSession.value.revokedAt);
						const isExpired = yield* DateTime.isPast(maybeSession.value.expiresAt);

						if (isRevoked || isExpired) {
							return Option.none();
						}

						return Option.some({ id: maybeSession.value.id, userId: maybeSession.value.userId });
					}),
				},
			} satisfies Session["Type"];
		}),
	).pipe(Layer.provide(DatabaseLive)) satisfies Layer.Layer<Session, unknown>;
}
