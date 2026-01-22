import { createCollection, localOnlyCollectionOptions } from "@tanstack/react-db";
import { Schema } from "effect";

import { SessionModel } from "@naamio/schema/domain";

const SessionCacheEntry = Schema.Struct({ id: SessionModel.json.fields.id, refreshedAt: Schema.DateFromSelf });

export type SessionCacheEntry = (typeof SessionCacheEntry)["Type"];

export const sessionCacheCollection = createCollection(
	localOnlyCollectionOptions({
		getKey: (cacheEntry) => cacheEntry.id,
		schema: Schema.standardSchemaV1(SessionCacheEntry),
	}),
);
