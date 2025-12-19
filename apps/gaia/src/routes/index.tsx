import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { Button } from "@naamio/design-system/components/button";
import { Icon } from "@naamio/design-system/components/icon";
import stylex from "@naamio/stylex";

import { NaamioApiClient } from "#src/modules/api-client/mod.js";
import { runtime } from "#src/modules/effect-runtime/mod.js";

const styles = stylex.create({
	heading: { alignItems: "center", color: "rebeccapurple", display: "flex", fontSize: 14, gap: 4, marginBlock: 8 },
	icon: { height: 16, width: 16 },
});

const getGreeting = createServerFn().handler(async () =>
	runtime.runPromise(
		Effect.gen(function* () {
			const naamioApiClient = yield* NaamioApiClient;

			yield* Effect.log("lol");

			return yield* naamioApiClient.example.greeting();
		}),
	),
);

const Home = () => (
	<>
		<title>Home | Naamio</title>
		<h1 {...stylex.props(styles.heading)}>
			<Trans>Hello world</Trans> <Icon name="webhook" style={styles.icon} />
		</h1>
		<Button
			onClick={async () => {
				const greeting = await getGreeting();

				// eslint-disable-next-line no-alert -- temporary for testing integration
				globalThis.alert(greeting);
			}}
		/>
	</>
);

export const Route = createFileRoute("/")({ component: Home });
