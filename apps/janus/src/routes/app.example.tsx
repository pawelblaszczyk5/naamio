import { createFileRoute } from "@tanstack/react-router";

import { ExamplePage } from "#src/modules/app/ui/example-page.js";

export const Route = createFileRoute("/app/example")({ component: ExamplePage });
