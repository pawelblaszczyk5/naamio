import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection, useLiveQuery } from "@tanstack/react-db";
import { Schema, String } from "effect";

import { UserModel } from "@naamio/schema/domain";

const User = Schema.Struct({
	email: UserModel.json.fields.email,
	id: UserModel.json.fields.id,
	language: UserModel.json.fields.language,
});

const userCollection = createCollection(
	electricCollectionOptions({
		getKey: (item) => item.id,
		schema: Schema.standardSchemaV1(User),
		shapeOptions: {
			columnMapper: { decode: String.snakeToCamel, encode: String.camelToSnake },
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/user`,
		},
	}),
);

export const preloadUserData = async () => userCollection.preload();

export const useMaybeCurrentUser = () => {
	const { data } = useLiveQuery((q) => q.from({ user: userCollection }).findOne());

	return data;
};
