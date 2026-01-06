import { useLingui } from "@lingui/react";

import type { UserModel } from "@naamio/schema";

export const useCurrentLanguage = () => {
	const { i18n } = useLingui();

	return i18n.locale as UserModel["language"];
};
