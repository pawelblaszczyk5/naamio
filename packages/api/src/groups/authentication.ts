import { HttpApiEndpoint, HttpApiError, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform";
import { Schema } from "effect";

import { EmailChallengeCode, EmailChallengeModel, SessionModel } from "@naamio/schema";

import { InsufficientStorage, TooManyRequests } from "#src/errors/mod.js";

const stateParam = HttpApiSchema.param("state", EmailChallengeModel.json.fields.state);

export class Authentication extends HttpApiGroup.make("Authentication")
	.add(
		HttpApiEndpoint.post("initializeEmailChallenge", "/email-challenge")
			.setPayload(EmailChallengeModel.jsonCreate.pick("language", "email"))
			.addSuccess(EmailChallengeModel.json.pick("state", "expiresAt"))
			.addError(TooManyRequests)
			.addError(InsufficientStorage)
			.annotateContext(
				OpenApi.annotations({
					description:
						"Allows to create a new email challenge that allows to create a session token suitable for interacting with part of the app that requires authentication. Returns a state that's a sole user-facing identifier for this challenge, and should be used for further requests regarding this challenge. It should be stored in a way that disallows user to modify it.",
					summary: "Initialize new email challenge.",
				}),
			),
	)
	.add(
		HttpApiEndpoint.post("refreshEmailChallenge")`/email-challenge/${stateParam}/refresh`
			.addSuccess(EmailChallengeModel.json.pick("state", "expiresAt"))
			.addError(TooManyRequests)
			.addError(InsufficientStorage)
			.addError(HttpApiError.BadRequest)
			.annotateContext(
				OpenApi.annotations({
					description:
						"Allows to refresh already existing challenge, as long as it's valid and user still has tied state available - it didn't expire yet and isn't revoked. It revokes the refreshed challenge and creates a completely new one. It's only available after a brief delay which is indicated by the challenge metadata.",
					summary: "Refresh existing email challenge.",
				}),
			),
	)
	.add(
		HttpApiEndpoint.post("solveEmailChallenge")`/email-challenge/${stateParam}/solve`
			.setPayload(
				Schema.extend(SessionModel.jsonCreate.pick("deviceLabel"))(Schema.Struct({ code: EmailChallengeCode })),
			)
			.addSuccess(
				Schema.extend(SessionModel.json.pick("expiresAt"))(
					Schema.Struct({ token: Schema.NonEmptyTrimmedString.pipe(Schema.Redacted) }),
				),
			)
			.addError(InsufficientStorage)
			.addError(HttpApiError.BadRequest)
			.annotateContext(
				OpenApi.annotations({
					description:
						"Performs an attempt at solving the challenge that was previously initialized. It requires providing the code that was sent to the user via email. After successfully performing a challenge, new session is minted for a given user which allows for further interactions with the app.",
					summary: "Solve a challenge to mint session.",
				}),
			),
	)
	.add(
		HttpApiEndpoint.get("getEmailChallengeMetadata")`/email-challenge/${stateParam}`
			.addSuccess(
				EmailChallengeModel.json.pick("refreshAvailableAt", "expiresAt", "remainingAttempts", "email", "language"),
			)
			.addError(HttpApiError.NotFound)
			.annotateContext(
				OpenApi.annotations({
					description:
						"Allows to fetch the metadata of a given challenge, helpful for displaying user information about the state of his ongoing attempt to sign in into the system.",
					summary: "Retrieve challenge information.",
				}),
			),
	)
	.prefix("/authentication")
	.annotateContext(
		OpenApi.annotations({
			description: "Everything related to authenticating user and allowing to use secure parts of the app.",
		}),
	) {}
