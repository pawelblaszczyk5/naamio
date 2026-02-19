import type { Redacted } from "effect";

import { ServiceMap } from "effect";

export class SessionToken extends ServiceMap.Service<SessionToken, Redacted.Redacted>()("@naamio/janus/SessionToken") {}
