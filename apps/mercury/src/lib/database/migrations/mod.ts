import type { Migrator } from "@effect/sql";

import { initialAuthMigration } from "#src/lib/database/migrations/0001-initial-auth.js";

export const allMigrations: Array<Migrator.ResolvedMigration> = [initialAuthMigration];
