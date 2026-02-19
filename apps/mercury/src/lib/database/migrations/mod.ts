import type { Migrator } from "effect/unstable/sql";

import { initialAuthMigration } from "#src/lib/database/migrations/0001-initial-auth.js";
import { chatMigration } from "#src/lib/database/migrations/0002-chat.js";

export const allMigrations: Array<Migrator.ResolvedMigration> = [initialAuthMigration, chatMigration];
