import type { Redacted } from "effect";

import { Context } from "effect";

export class SessionToken extends Context.Tag("@naamio/janus/SessionToken")<SessionToken, Redacted.Redacted>() {}
