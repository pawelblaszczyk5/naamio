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
			let subscription: null | ReturnType<(typeof userCollection)["subscribeChanges"]> = null;

			const unsubscribeFromStatusChanges = userCollection.on("status:change", (event) => {
				if (event.status === "ready") {
					subscription = userCollection.subscribeChanges(callback);

					return;
				}

				if (subscription) {
					subscription.unsubscribe();
					subscription = null;
				}
			});

			return () => {
				subscription?.unsubscribe();
				unsubscribeFromStatusChanges();
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
export const cleanupUserData = async () => userCollection.cleanup();
