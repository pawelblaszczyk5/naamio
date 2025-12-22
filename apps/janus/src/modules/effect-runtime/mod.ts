import { Layer, Logger, ManagedRuntime } from "effect";

import { ObservabilityLive } from "@naamio/observability";

const EnvironmentLive = Logger.pretty.pipe(Layer.provide(ObservabilityLive));

export const runtime = ManagedRuntime.make(EnvironmentLive);
