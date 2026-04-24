import type { Redacted } from "effect";

import { Context } from "effect";

import "@tanstack/react-start/server-only";

export class SessionToken extends Context.Service<SessionToken, Redacted.Redacted>()("@naamio/janus/SessionToken") {}
