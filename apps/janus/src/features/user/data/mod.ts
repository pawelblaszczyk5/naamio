import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { Schema, String } from "effect";
import { useSyncExternalStore } from "react";

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
			liveSse: true,
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/user`,
		},
	}),
);

export const useCurrentUserLanguageSsrSafe = () => {
	const language = useSyncExternalStore(
		(callback) => {
			const subscription = userCollection.subscribeChanges(callback);

			return () => {
				subscription.unsubscribe();
			};
		},
		() => {
			const user = userCollection.state.values().take(1).next().value;

			if (user) {
				return user.language;
			}

			return null;
		},
		() => null,
	);

	return language;
};

export const preloadUserData = async () => userCollection.preload();
