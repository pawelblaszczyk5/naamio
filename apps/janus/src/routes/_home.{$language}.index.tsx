import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "#src/modules/home/ui/home-page.js";

export const Route = createFileRoute("/_home/{$language}/")({ component: HomePage });
