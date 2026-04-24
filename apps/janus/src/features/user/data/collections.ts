import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { BasicIndex, BTreeIndex, createCollection, localOnlyCollectionOptions } from "@tanstack/react-db";
import { Schema, String } from "effect";

import { PasskeyModel, SessionModel, UserModel } from "@naamio/schema/domain";

export const User = Schema.Struct({
	id: UserModel.json.fields.id,
	language: UserModel.json.fields.language,
	username: UserModel.json.fields.username,
});
export type User = Schema.Schema.Type<typeof User>;

export const usersCollection = createCollection(
	electricCollectionOptions({
		autoIndex: "eager",
		defaultIndexType: BasicIndex,
		getKey: (item) => item.id,
		schema: Schema.toStandardSchemaV1(User),
		shapeOptions: {
			columnMapper: { decode: String.snakeToCamel, encode: String.camelToSnake },
			liveSse: true,
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/user`,
		},
	}),
);

export const Session = Schema.Struct({
	deviceLabel: Schema.NullOr(SessionModel.json.fields.deviceLabel.from),
	expiresAt: Schema.Date,
	id: SessionModel.json.fields.id,
	passkeyId: SessionModel.json.fields.passkeyId,
});
export type Session = Schema.Schema.Type<typeof Session>;

export const sessionsCollection = createCollection(
	electricCollectionOptions({
		autoIndex: "eager",
		defaultIndexType: BTreeIndex,
		getKey: (item) => item.id,
		schema: Schema.toStandardSchemaV1(Session),
		shapeOptions: {
			columnMapper: { decode: String.snakeToCamel, encode: String.camelToSnake },
			liveSse: true,
			parser: { timestamptz: (date: string) => new Date(date) },
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/session`,
		},
	}),
);

export const LocalSession = Schema.Struct({ id: SessionModel.json.fields.id, refreshedAt: Schema.Date });
export type LocalSession = Schema.Schema.Type<typeof LocalSession>;

export const localSessionsCollection = createCollection(
	localOnlyCollectionOptions({
		autoIndex: "eager",
		defaultIndexType: BasicIndex,
		getKey: (cacheEntry) => cacheEntry.id,
		schema: Schema.toStandardSchemaV1(LocalSession),
	}),
);

export const Passkey = Schema.Struct({
	aaguid: PasskeyModel.json.fields.aaguid,
	backedUp: PasskeyModel.json.fields.backedUp,
	createdAt: Schema.Date,
	deviceType: PasskeyModel.json.fields.deviceType,
	displayName: PasskeyModel.json.fields.displayName,
	id: PasskeyModel.json.fields.id,
});

export type Passkey = Schema.Schema.Type<typeof Passkey>;

export const passkeysCollection = createCollection(
	electricCollectionOptions({
		autoIndex: "eager",
		defaultIndexType: BTreeIndex,
		getKey: (item) => item.id,
		schema: Schema.toStandardSchemaV1(Passkey),
		shapeOptions: {
			columnMapper: { decode: String.snakeToCamel, encode: String.camelToSnake },
			liveSse: true,
			parser: { timestamptz: (date: string) => new Date(date) },
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/passkey`,
		},
	}),
);
