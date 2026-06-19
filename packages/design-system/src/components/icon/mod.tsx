import type { StyleXStyles } from "@stylexjs/stylex";

import stylex from "@stylexjs/stylex";
import { use } from "react";

import { assert } from "@naamio/assert";

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

export { IconSpritesheetContext } from "#src/components/icon/context.jsx";
