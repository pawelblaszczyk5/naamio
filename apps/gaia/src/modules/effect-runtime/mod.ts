import { Layer, Logger, ManagedRuntime } from "effect";

import { NaamioApiClient } from "#src/modules/api-client/mod.js";

const EnvironmentLive = Layer.mergeAll(NaamioApiClient.Live, Logger.pretty);

export const runtime = ManagedRuntime.make(EnvironmentLive);
