import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { Schema, String } from "effect";

import { UserModel } from "@naamio/schema/domain";

const User = Schema.Struct({
	id: UserModel.json.fields.id,
	language: UserModel.json.fields.language,
	username: UserModel.json.fields.username,
});

export type User = (typeof User)["Type"];

export const userCollection = createCollection(
	electricCollectionOptions({
		getKey: (item) => item.id,
		schema: Schema.toStandardSchemaV1(User),
		shapeOptions: {
			columnMapper: { decode: String.snakeToCamel, encode: String.camelToSnake },
			liveSse: true,
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/user`,
		},
	}),
);

export const preloadUserData = async () => userCollection.preload();
