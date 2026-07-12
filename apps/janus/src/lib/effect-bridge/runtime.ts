import { Layer, ManagedRuntime } from "effect";

import { ObservabilityLayer } from "@naamio/observability";

import { NaamioApiClient, NaamioHttpClient, NaamioUrlBuilder } from "#src/lib/api-client/mod.js";
import { CookieSigner } from "#src/lib/cookie-signer/mod.js";

import "@tanstack/react-start/server-only";

const EnvironmentLayer = Layer.mergeAll(
	NaamioHttpClient.layer,
	NaamioApiClient.layer,
	NaamioUrlBuilder.layer,
	CookieSigner.layer,
).pipe(Layer.provideMerge(ObservabilityLayer));

const symbol = Symbol.for("@naamio/janus/RuntimeContainer");

const createRuntimeWithHmrDisposing = () => {
	if (import.meta.env.PROD) {
		return ManagedRuntime.make(EnvironmentLayer);
	}

	const globalThisExtended = globalThis as typeof globalThis & { [symbol]?: ManagedRuntime.ManagedRuntime<any, any> };

	const existingRuntime = globalThisExtended[symbol];

	if (existingRuntime) {
		void existingRuntime.dispose();
	}

	return (globalThisExtended[symbol] = ManagedRuntime.make(EnvironmentLayer));
};

export const runtime = createRuntimeWithHmrDisposing();
