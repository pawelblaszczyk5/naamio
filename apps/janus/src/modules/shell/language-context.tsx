import { createContext } from "react";

import type { UserModel } from "@naamio/schema";

export const LanguageContext = createContext<null | UserModel["language"]>(null);

LanguageContext.displayName = "LanguageContext";
