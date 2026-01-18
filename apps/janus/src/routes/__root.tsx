import { createRootRoute } from "@tanstack/react-router";

import { RootDocument } from "#src/lib/shell/root-document.js";

export const Route = createRootRoute({ component: RootDocument });
