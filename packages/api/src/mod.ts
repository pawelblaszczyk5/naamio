import { HttpApi, OpenApi } from "effect/unstable/httpapi";

import { Passkey } from "#src/groups/passkey.js";
import { Session } from "#src/groups/session.js";
import { User } from "#src/groups/user.js";
import { WebAuthn } from "#src/groups/web-authn.js";

export class NaamioApi extends HttpApi.make("NaamioApi")
	.add(WebAuthn)
	.add(Session)
	.add(User)
	.add(Passkey)
	.prefix("/api")
	.annotateMerge(
		OpenApi.annotations({
			description:
				"Internal API of the application, used for communication between any of the frontend systems and the one true backend - Mercury.",
			title: "Naamio API",
		}),
	) {}
