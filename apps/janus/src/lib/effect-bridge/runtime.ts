import { Layer, Logger, ManagedRuntime } from "effect";

import { ObservabilityLive } from "@naamio/observability";

import { CookieSigner } from "#src/features/auth/utilities/cookie-signer.js";
import { NaamioApiClient, NaamioHttpClient } from "#src/lib/api-client/mod.js";

const EnvironmentLive = Layer.mergeAll(NaamioHttpClient.Live, NaamioApiClient.Live, CookieSigner.Live).pipe(
	Layer.provide([Logger.pretty, ObservabilityLive]),
);

export const runtime = ManagedRuntime.make(EnvironmentLive);
