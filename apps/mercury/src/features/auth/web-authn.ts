import type { WebAuthnCredential } from "@simplewebauthn/server";

import { ClusterCron } from "@effect/cluster";
import { SqlSchema } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";
import {
	Config,
	Context,
	Cron,
	DateTime,
	Duration,
	Effect,
	Encoding,
	Layer,
	Match,
	Option,
	Redacted,
	Schema,
} from "effect";

import type { WebAuthnAuthenticationResponse, WebAuthnRegistrationResponse } from "@naamio/schema/api";
import type { UserModel } from "@naamio/schema/domain";

import { generateId } from "@naamio/id-generator/effect";
import { WebAuthnAuthenticationOptions, WebAuthnRegistrationOptions } from "@naamio/schema/api";
import {
	PasskeyModel,
	WebAuthnAuthenticationChallengeModel,
	WebAuthnChallengeType,
	WebAuthnRegistrationChallengeModel,
} from "@naamio/schema/domain";

import { ClusterRunnerLive } from "#src/lib/cluster/mod.js";
import { DatabaseLive } from "#src/lib/database/mod.js";

export class UnavailableChallengeError extends Schema.TaggedError<UnavailableChallengeError>(
	"@naamio/mercury/WebAuthn/UnavailableChallengeError",
)("UnavailableChallengeError", {}) {}

export class FailedVerificationError extends Schema.TaggedError<FailedVerificationError>(
	"@naamio/mercury/WebAuthn/FailedVerificationError",
)("FailedVerificationError", {}) {}

export class MissingPasskeyError extends Schema.TaggedError<MissingPasskeyError>(
	"@naamio/mercury/WebAuthn/MissingPasskeyError",
)("MissingPasskeyError", {}) {}

export class WebAuthn extends Context.Tag("@naamio/mercury/WebAuthn")<
	WebAuthn,
	{
		system: {
			deleteExpiredChallenges: () => Effect.Effect<void>;
			generateAuthenticationOptions: (
				maybeUserId: Option.Option<UserModel["id"]>,
			) => Effect.Effect<{
				authenticationOptions: WebAuthnAuthenticationOptions;
				challengeId: WebAuthnAuthenticationChallengeModel["id"];
				expiresAt: WebAuthnAuthenticationChallengeModel["expiresAt"];
			}>;
			generateRegistrationOptions: (
				user: Pick<UserModel, "id" | "username" | "webAuthnId">
					& Pick<WebAuthnRegistrationChallengeModel, "displayName">,
			) => Effect.Effect<{
				challengeId: WebAuthnRegistrationChallengeModel["id"];
				expiresAt: WebAuthnRegistrationChallengeModel["expiresAt"];
				registrationOptions: WebAuthnRegistrationOptions;
			}>;
			verifyAuthenticationResponse: (data: {
				authenticationResponse: WebAuthnAuthenticationResponse;
				challengeId: WebAuthnAuthenticationChallengeModel["id"];
			}) => Effect.Effect<
				Pick<PasskeyModel, "id" | "userId">,
				FailedVerificationError | MissingPasskeyError | UnavailableChallengeError
			>;
			verifyRegistrationResponse: (data: {
				challengeId: WebAuthnRegistrationChallengeModel["id"];
				registrationResponse: WebAuthnRegistrationResponse;
			}) => Effect.Effect<Pick<PasskeyModel, "id" | "userId">, FailedVerificationError | UnavailableChallengeError>;
		};
	}
>() {
	static Live = Layer.effect(
		this,
		Effect.gen(function* () {
			const RP_NAME = yield* Config.string("WEB_AUTHN_RP_NAME");
			const RP_ID = yield* Config.string("WEB_AUTHN_RP_ID");
			const ORIGIN = yield* Config.string("WEB_AUTHN_ORIGIN");

			const CHALLENGE_TIMEOUT = Duration.seconds(150);

			const sql = yield* PgClient.PgClient;

			const textEncoder = new TextEncoder();

			const insertRegistrationChallenge = SqlSchema.void({
				execute: (request) => sql`
					INSERT INTO
						${sql("webAuthnChallenge")} ${sql.insert(request)};
				`,
				Request: WebAuthnRegistrationChallengeModel.insert,
			});

			const deleteRegistrationChallenge = SqlSchema.void({
				execute: (request) => sql`
					DELETE FROM ${sql("webAuthnChallenge")}
					WHERE
						${sql.and([
							sql`${sql("id")} = ${request}`,
							sql`${sql("type")} = ${WebAuthnChallengeType.enums.REGISTRATION}`,
						])};
				`,
				Request: WebAuthnRegistrationChallengeModel.select.fields.id,
			});

			const findRegistrationChallengeById = SqlSchema.findOne({
				execute: (request) => sql`
					SELECT
						${sql("challengeValue")},
						${sql("expiresAt")},
						${sql("displayName")},
						${sql("userId")}
					FROM
						${sql("webAuthnChallenge")}
					WHERE
						${sql.and([
							sql`${sql("id")} = ${request}`,
							sql`${sql("type")} = ${WebAuthnChallengeType.enums.REGISTRATION}`,
						])}
					FOR UPDATE;
				`,
				Request: WebAuthnRegistrationChallengeModel.select.fields.id,
				Result: WebAuthnRegistrationChallengeModel.select.pick("challengeValue", "expiresAt", "userId", "displayName"),
			});

			const insertAuthenticationChallenge = SqlSchema.void({
				execute: (request) => sql`
					INSERT INTO
						${sql("webAuthnChallenge")} ${sql.insert(request)};
				`,
				Request: WebAuthnAuthenticationChallengeModel.insert,
			});

			const deleteAuthenticationChallenge = SqlSchema.void({
				execute: (request) => sql`
					DELETE FROM ${sql("webAuthnChallenge")}
					WHERE
						${sql.and([
							sql`${sql("id")} = ${request}`,
							sql`${sql("type")} = ${WebAuthnChallengeType.enums.AUTHENTICATION}`,
						])};
				`,
				Request: WebAuthnAuthenticationChallengeModel.select.fields.id,
			});

			const findAuthenticationChallengeById = SqlSchema.findOne({
				execute: (request) => sql`
					SELECT
						${sql("challengeValue")},
						${sql("expiresAt")},
						${sql("userId")}
					FROM
						${sql("webAuthnChallenge")}
					WHERE
						${sql.and([
							sql`${sql("id")} = ${request}`,
							sql`${sql("type")} = ${WebAuthnChallengeType.enums.AUTHENTICATION}`,
						])}
					FOR UPDATE;
				`,
				Request: WebAuthnAuthenticationChallengeModel.select.fields.id,
				Result: WebAuthnAuthenticationChallengeModel.select.pick("challengeValue", "expiresAt", "userId"),
			});

			const deleteChallengesExpiredBefore = SqlSchema.void({
				execute: (request) => sql`
					DELETE FROM ${sql("webAuthnChallenge")}
					WHERE
						${sql("expiresAt")} < ${request}
				`,
				Request: Schema.Union(
					WebAuthnAuthenticationChallengeModel.select.fields.expiresAt,
					WebAuthnRegistrationChallengeModel.select.fields.expiresAt,
				),
			});

			const insertPasskey = SqlSchema.void({
				execute: (request) => sql`
					INSERT INTO
						${sql("passkey")} ${sql.insert(request)};
				`,
				Request: PasskeyModel.insert,
			});

			const updatePasskeyCounter = SqlSchema.void({
				execute: (request) => sql`
					UPDATE ${sql("passkey")}
					SET
						${sql.update(request, ["id"])}
					WHERE
						${sql("id")} = ${request.id};
				`,
				Request: PasskeyModel.update.pick("id", "counter"),
			});

			const findPassKeyByCredentialIdForVerification = SqlSchema.findOne({
				execute: (request) => sql`
					SELECT
						${sql("id")},
						${sql("credentialId")},
						${sql("publicKey")},
						${sql("counter")},
						${sql("userId")},
						${sql("transports")}
					FROM
						${sql("passkey")}
					WHERE
						${sql("credentialId")} = ${request}
					FOR UPDATE;
				`,
				Request: PasskeyModel.select.fields.credentialId,
				Result: PasskeyModel.select.pick("credentialId", "publicKey", "counter", "transports", "id", "userId"),
			});

			const findPasskeysByUserIdForAuthentication = SqlSchema.findAll({
				execute: (request) => sql`
					SELECT
						${sql("credentialId")},
						${sql("transports")}
					FROM
						${sql("passkey")}
					WHERE
						${sql("userId")} = ${request};
				`,
				Request: PasskeyModel.select.fields.userId,
				Result: PasskeyModel.select.pick("credentialId", "transports"),
			});

			return WebAuthn.of({
				system: {
					deleteExpiredChallenges: Effect.fn("@naamio/mercury/WebAuthn#deleteExpiredChallenges")(function* () {
						const now = yield* DateTime.now;

						yield* deleteChallengesExpiredBefore(now).pipe(Effect.catchTag("ParseError", "SqlError", Effect.die));
					}),
					generateAuthenticationOptions: Effect.fn("@naamio/mercury/WebAuthn#generateAuthenticationOptions")(
						function* (maybeUserId) {
							const authenticationOptions = yield* Option.match(maybeUserId, {
								onNone: Effect.fn(function* () {
									return yield* Effect.promise(async () =>
										generateAuthenticationOptions({
											allowCredentials: [],
											rpID: RP_ID,
											timeout: Duration.toMillis(CHALLENGE_TIMEOUT),
											userVerification: "preferred",
										}),
									);
								}),
								onSome: Effect.fn(function* (userId) {
									const passkeys = yield* findPasskeysByUserIdForAuthentication(userId).pipe(
										Effect.catchTag("ParseError", "SqlError", Effect.die),
									);

									return yield* Effect.promise(async () =>
										generateAuthenticationOptions({
											allowCredentials: passkeys.map((passkey) => {
												if (Option.isNone(passkey.transports)) {
													return { id: passkey.credentialId };
												}

												return { id: passkey.credentialId, transports: [...passkey.transports.value] };
											}),
											rpID: RP_ID,
											timeout: Duration.toMillis(CHALLENGE_TIMEOUT),
											userVerification: "preferred",
										}),
									);
								}),
							}).pipe(
								Effect.flatMap(Schema.decode(WebAuthnAuthenticationOptions)),
								Effect.catchTag("ParseError", Effect.die),
							);

							const challengeId = WebAuthnAuthenticationChallengeModel.fields.id.make(yield* generateId());

							const challengeExpiration = yield* DateTime.now.pipe(
								Effect.map((dateTime) => DateTime.addDuration(dateTime, CHALLENGE_TIMEOUT)),
							);

							yield* insertAuthenticationChallenge({
								challengeValue: authenticationOptions.challenge,
								expiresAt: challengeExpiration,
								id: challengeId,
								type: "AUTHENTICATION",
								userId: maybeUserId,
							}).pipe(Effect.catchTag("ParseError", "SqlError", Effect.die));

							return { authenticationOptions, challengeId, expiresAt: challengeExpiration };
						},
					),
					generateRegistrationOptions: Effect.fn("@naamio/mercury/WebAuthn#generateRegistrationOptions")(
						function* (data) {
							const registrationOptions = yield* Effect.promise(async () =>
								generateRegistrationOptions({
									authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
									rpID: RP_ID,
									rpName: RP_NAME,
									timeout: Duration.toMillis(CHALLENGE_TIMEOUT),
									userDisplayName: data.displayName,
									userID: textEncoder.encode(data.webAuthnId),
									userName: data.username,
								}),
							).pipe(
								Effect.flatMap(Schema.decode(WebAuthnRegistrationOptions)),
								Effect.catchTag("ParseError", Effect.die),
							);

							const challengeId = WebAuthnRegistrationChallengeModel.fields.id.make(yield* generateId());

							const challengeExpiration = yield* DateTime.now.pipe(
								Effect.map((dateTime) => DateTime.addDuration(dateTime, CHALLENGE_TIMEOUT)),
							);

							yield* insertRegistrationChallenge({
								challengeValue: registrationOptions.challenge,
								displayName: data.displayName,
								expiresAt: challengeExpiration,
								id: challengeId,
								type: "REGISTRATION",
								userId: data.id,
							}).pipe(Effect.catchTag("ParseError", "SqlError", Effect.die));

							return { challengeId, expiresAt: challengeExpiration, registrationOptions };
						},
					),
					verifyAuthenticationResponse: Effect.fn("@naamio/mercury/WebAuthn#verifyAuthenticationResponse")(
						function* (data) {
							const result = yield* Effect.gen(function* () {
								const maybeAuthenticationChallenge = yield* findAuthenticationChallengeById(data.challengeId).pipe(
									Effect.catchTag("ParseError", "SqlError", Effect.die),
								);

								if (Option.isNone(maybeAuthenticationChallenge)) {
									return yield* new UnavailableChallengeError();
								}

								yield* deleteAuthenticationChallenge(data.challengeId).pipe(
									Effect.catchTag("ParseError", "SqlError", Effect.die),
								);

								if (yield* DateTime.isPast(maybeAuthenticationChallenge.value.expiresAt)) {
									return yield* new UnavailableChallengeError();
								}

								const maybePasskey = yield* findPassKeyByCredentialIdForVerification(
									PasskeyModel.fields.credentialId.make(data.authenticationResponse.id),
								).pipe(Effect.catchTag("ParseError", "SqlError", Effect.die));

								if (Option.isNone(maybePasskey)) {
									return yield* new MissingPasskeyError();
								}

								if (
									Option.isSome(maybeAuthenticationChallenge.value.userId)
									&& maybePasskey.value.userId !== maybeAuthenticationChallenge.value.userId.value
								) {
									return yield* new FailedVerificationError();
								}

								const encodedPublicKey = Uint8Array.from(
									yield* Encoding.decodeBase64(Redacted.value(maybePasskey.value.publicKey)).pipe(
										Effect.catchTag("DecodeException", Effect.die),
									),
								);

								const credential: WebAuthnCredential = Option.match(maybePasskey.value.transports, {
									onNone: () => ({
										counter: Number(maybePasskey.value.counter),
										id: maybePasskey.value.credentialId,
										publicKey: encodedPublicKey,
									}),
									onSome: (transports) => ({
										counter: Number(maybePasskey.value.counter),
										id: maybePasskey.value.credentialId,
										publicKey: encodedPublicKey,
										transports: [...transports],
									}),
								});

								const verificationResult = yield* Effect.tryPromise({
									catch: () => new FailedVerificationError(),
									try: async () =>
										verifyAuthenticationResponse({
											credential,
											expectedChallenge: maybeAuthenticationChallenge.value.challengeValue,
											expectedOrigin: ORIGIN,
											expectedRPID: RP_ID, // cspell:disable-line
											requireUserVerification: false,
											response: data.authenticationResponse,
										}),
								});

								if (!verificationResult.verified) {
									return yield* new FailedVerificationError();
								}

								yield* updatePasskeyCounter({
									counter: BigInt(verificationResult.authenticationInfo.newCounter),
									id: maybePasskey.value.id,
								}).pipe(Effect.catchTag("ParseError", "SqlError", Effect.die));

								return { id: maybePasskey.value.id, userId: maybePasskey.value.userId };
							}).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die));

							return result;
						},
					),
					verifyRegistrationResponse: Effect.fn("@naamio/mercury/WebAuthn#verifyRegistrationResponse")(
						function* (data) {
							const result = yield* Effect.gen(function* () {
								const maybeRegistrationChallenge = yield* findRegistrationChallengeById(data.challengeId).pipe(
									Effect.catchTag("ParseError", "SqlError", Effect.die),
								);

								if (Option.isNone(maybeRegistrationChallenge)) {
									return yield* new UnavailableChallengeError();
								}

								yield* deleteRegistrationChallenge(data.challengeId).pipe(
									Effect.catchTag("ParseError", "SqlError", Effect.die),
								);

								if (yield* DateTime.isPast(maybeRegistrationChallenge.value.expiresAt)) {
									return yield* new UnavailableChallengeError();
								}

								const verificationResult = yield* Effect.tryPromise({
									catch: () => new FailedVerificationError(),
									try: async () =>
										verifyRegistrationResponse({
											expectedChallenge: maybeRegistrationChallenge.value.challengeValue,
											expectedOrigin: ORIGIN,
											expectedRPID: RP_ID, // cspell:disable-line
											requireUserVerification: false,
											response: data.registrationResponse,
										}),
								});

								if (!verificationResult.verified) {
									return yield* new FailedVerificationError();
								}

								const passkeyId = PasskeyModel.fields.id.make(yield* generateId());
								const encodedPublicKey = Encoding.encodeBase64(
									verificationResult.registrationInfo.credential.publicKey,
								);

								yield* insertPasskey({
									aaguid: PasskeyModel.fields.aaguid.make(verificationResult.registrationInfo.aaguid),
									backedUp: verificationResult.registrationInfo.credentialBackedUp,
									counter: BigInt(verificationResult.registrationInfo.credential.counter),
									createdAt: undefined,
									credentialId: PasskeyModel.fields.credentialId.make(
										verificationResult.registrationInfo.credential.id,
									),
									deviceType: Match.value(verificationResult.registrationInfo.credentialDeviceType).pipe(
										Match.when("singleDevice", () => "SINGLE_DEVICE" as const),
										Match.when("multiDevice", () => "MULTI_DEVICE" as const),
										Match.exhaustive,
									),
									displayName: maybeRegistrationChallenge.value.displayName,
									id: passkeyId,
									publicKey: Redacted.make(encodedPublicKey),
									transports: Option.fromNullable(verificationResult.registrationInfo.credential.transports),
									userId: maybeRegistrationChallenge.value.userId,
								}).pipe(Effect.catchTag("ParseError", "SqlError", Effect.die));

								return { id: passkeyId, userId: maybeRegistrationChallenge.value.userId };
							}).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die));

							return result;
						},
					),
				},
			});
		}),
	).pipe(Layer.provide(DatabaseLive)) satisfies Layer.Layer<WebAuthn, unknown>;
}

export const CleanupExpiredChallengesJob = ClusterCron.make({
	cron: Cron.unsafeParse("*/15 * * * *"),
	execute: Effect.gen(function* () {
		const webAuthn = yield* WebAuthn;

		yield* webAuthn.system.deleteExpiredChallenges();
	}),
	name: "CleanupExpiredChallengesJob",
}).pipe(Layer.provide([ClusterRunnerLive, WebAuthn.Live]));
