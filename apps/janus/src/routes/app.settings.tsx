import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage } from "#src/features/user/ui/settings-page.js";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });
