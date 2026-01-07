import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { Schema } from "effect";

export const ElectricProtocolUrlParams = Schema.Record({
	key: Schema.Literal(...ELECTRIC_PROTOCOL_QUERY_PARAMS),
	value: Schema.String,
}).pipe(Schema.partial, Schema.brand("ElectricProtocolUrlParams"));
