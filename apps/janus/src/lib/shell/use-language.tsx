import { useLingui } from "@lingui/react";

import type { UserModel } from "@naamio/schema/domain";

export const useLanguage = () => {
	const { i18n } = useLingui();

	return i18n.locale as UserModel["language"];
};
