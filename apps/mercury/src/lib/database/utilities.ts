import { PgClient } from "@effect/sql-pg";
import { Effect, Schema } from "effect";
import { SqlSchema } from "effect/unstable/sql";

import { TransactionId } from "@naamio/schema/domain";

export const createGetTransactionId = Effect.fn(function* () {
	const sql = yield* PgClient.PgClient;

	const schema = SqlSchema.single({
		// cspell:ignore xact
		execute: () => sql`
			SELECT
				PG_CURRENT_XACT_ID()::XID::TEXT AS ${sql("transactionId")}
		`,
		Request: Schema.Void,
		Result: Schema.Struct({ transactionId: TransactionId }),
	});

	return Effect.fn(function* () {
		const result = yield* schema().pipe(Effect.catchTag(["NoSuchElementError", "SqlError", "SchemaError"], Effect.die));

		return result.transactionId;
	});
});
