import { use } from "react";

import type { StyleXStyles } from "@naamio/stylex";

import { assert } from "@naamio/assert";
import stylex from "@naamio/stylex";

import { IconSpritesheetContext } from "#src/components/icon/context.jsx";

export type IconName = "webhook";

export const Icon = ({ name, style }: Readonly<{ name: IconName; style?: StyleXStyles | undefined }>) => {
	const spritesheet = use(IconSpritesheetContext);

	assert(spritesheet, "IconSpritesheetContext must be provided globally");

	return (
		<svg height={20} width={20} aria-hidden {...stylex.props(style)}>
			<use href={`${spritesheet}#${name}`} />
		</svg>
	);
};
