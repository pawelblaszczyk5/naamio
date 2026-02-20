import { Layer, Logger, ManagedRuntime } from "effect";

import { ObservabilityLayer } from "@naamio/observability";

import { NaamioApiClient, NaamioHttpClient } from "#src/lib/api-client/mod.js";
import { CookieSigner } from "#src/lib/cookie-signer/mod.js";

import "@tanstack/react-start/server-only";

const EnvironmentLayer = Layer.mergeAll(NaamioHttpClient.layer, NaamioApiClient.layer, CookieSigner.layer).pipe(
	Layer.provideMerge([ObservabilityLayer, Logger.layer([Logger.consolePretty({ colors: true })])]),
);

const symbol = Symbol.for("@naamio/janus/RuntimeContainer");

const createRuntimeWithHmrDisposing = () => {
	const globalThisExtended = globalThis as typeof globalThis & { [symbol]?: ManagedRuntime.ManagedRuntime<any, any> };

	const existingRuntime = globalThisExtended[symbol];

	if (existingRuntime) {
		void existingRuntime.dispose();
	}

	return (globalThisExtended[symbol] = ManagedRuntime.make(EnvironmentLayer));
};

export const runtime = createRuntimeWithHmrDisposing();
