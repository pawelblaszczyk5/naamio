import stylex from "@naamio/stylex";

import { color } from "#src/theme/color.stylex.js";

const styles = stylex.create({ root: { backgroundColor: color.primary } });

export const Button = ({ onClick }: { onClick: () => void }) => (
	<button
		onClick={() => {
			onClick();
		}}
		type="button"
		{...stylex.props(styles.root)}
	>
		Click me!
	</button>
);
