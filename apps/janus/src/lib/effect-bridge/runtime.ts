import { Layer, Logger, ManagedRuntime } from "effect";

import { ObservabilityLive } from "@naamio/observability";

import { CookieSigner } from "#src/features/auth/utilities/cookie-signer.js";
import { NaamioApiClient, NaamioHttpClient } from "#src/lib/api-client/mod.js";

const EnvironmentLive = Layer.mergeAll(NaamioHttpClient.Live, NaamioApiClient.Live, CookieSigner.Live).pipe(
	Layer.provide([Logger.pretty, ObservabilityLive]),
);

const symbol = Symbol.for("@naamio/janus/RuntimeContainer");

const createRuntimeWithHmrDisposing = () => {
	const globalThisExtended = globalThis as typeof globalThis & { [symbol]?: ManagedRuntime.ManagedRuntime<any, any> };

	const existingRuntime = globalThisExtended[symbol];

	if (existingRuntime) {
		void existingRuntime.dispose();
	}

	return (globalThisExtended[symbol] = ManagedRuntime.make(EnvironmentLive));
};

export const runtime = createRuntimeWithHmrDisposing();
