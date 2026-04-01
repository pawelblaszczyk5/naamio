import { BTreeIndex, createCollection, localOnlyCollectionOptions } from "@tanstack/react-db";
import { Schema } from "effect";

import { SessionModel } from "@naamio/schema/domain";

export const SessionCacheEntry = Schema.Struct({ id: SessionModel.json.fields.id, refreshedAt: Schema.Date });

export type SessionCacheEntry = Schema.Schema.Type<typeof SessionCacheEntry>;

export const sessionCacheCollection = createCollection(
	localOnlyCollectionOptions({
		autoIndex: "eager",
		defaultIndexType: BTreeIndex,
		getKey: (cacheEntry) => cacheEntry.id,
		schema: Schema.toStandardSchemaV1(SessionCacheEntry),
	}),
);
