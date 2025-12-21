import { Layer, Logger, ManagedRuntime } from "effect";

import { ObservabilityLive } from "@naamio/observability";

import { NaamioApiClient } from "#src/modules/api-client/mod.js";

const EnvironmentLive = Layer.mergeAll(NaamioApiClient.Live, Logger.pretty).pipe(Layer.provide(ObservabilityLive));

export const runtime = ManagedRuntime.make(EnvironmentLive);
