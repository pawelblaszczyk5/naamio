import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection, eq, useLiveQuery } from "@tanstack/react-db";
import { Schema, String } from "effect";

import { SessionModel } from "@naamio/schema/domain";

const Session = Schema.Struct({
	deviceLabel: Schema.NullOr(SessionModel.json.fields.deviceLabel.from),
	expiresAt: Schema.DateFromSelf,
	id: SessionModel.json.fields.id,
});

type Session = (typeof Session)["Type"];

const sessionCollection = createCollection(
	electricCollectionOptions({
		getKey: (item) => item.id,
		schema: Schema.standardSchemaV1(Session),
		shapeOptions: {
			columnMapper: { decode: String.snakeToCamel, encode: String.camelToSnake },
			liveSse: true,
			parser: { timestamptz: (date: string) => new Date(date) },
			url: `${import.meta.env.VITE_SITE_DOMAIN}/api/shape/session`,
		},
	}),
);

export const useSessionById = (id: Session["id"]) =>
	useLiveQuery(
		(q) =>
			q
				.from({ session: sessionCollection })
				.where(({ session }) => eq(session.id, id))
				.findOne(),
		[id],
	).data;

export const preloadSessionData = async () => sessionCollection.preload();
