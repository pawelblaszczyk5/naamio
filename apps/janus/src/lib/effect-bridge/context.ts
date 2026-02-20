import type { Redacted } from "effect";

import { ServiceMap } from "effect";

import "@tanstack/react-start/server-only";

export class SessionToken extends ServiceMap.Service<SessionToken, Redacted.Redacted>()("@naamio/janus/SessionToken") {}
