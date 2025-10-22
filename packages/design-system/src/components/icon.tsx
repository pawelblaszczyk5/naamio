import { createContext, use } from "react";

import type { StyleXStyles } from "@naamio/stylex";

import { assert } from "@naamio/assert";
import stylex from "@naamio/stylex";

export type IconName = "webhook";

// eslint-disable-next-line react-refresh/only-export-components -- this won't ever be HMR-edited
export const IconSpritesheetContext = createContext<null | string>(null);

IconSpritesheetContext.displayName = "IconSpritesheetContext";

export const Icon = ({ name, style }: Readonly<{ name: IconName; style?: StyleXStyles | undefined }>) => {
	const spritesheet = use(IconSpritesheetContext);

	assert(spritesheet, "IconSpritesheetContext must be provided globally");

	return (
		<svg height={20} width={20} aria-hidden {...stylex.props(style)}>
			<use href={`${spritesheet}#${name}`} />
		</svg>
	);
};
