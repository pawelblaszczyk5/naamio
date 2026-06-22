import { HomeLayout } from "fumadocs-ui/layouts/home";
import { DefaultNotFound } from "fumadocs-ui/layouts/home/not-found";

import { baseOptions } from "#src/lib/layout.shared.js";

export const NotFound = () => (
	<HomeLayout {...baseOptions()}>
		<DefaultNotFound />
	</HomeLayout>
);
