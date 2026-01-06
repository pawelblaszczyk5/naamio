import { createFileRoute } from "@tanstack/react-router";

import { AppPage } from "#src/modules/app/ui/app-page.js";

export const Route = createFileRoute("/app/")({ component: AppPage });
