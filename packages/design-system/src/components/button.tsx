import stylex from "@naamio/stylex";

import { color } from "#src/theme/color.stylex.js";

const styles = stylex.create({ root: { backgroundColor: color.primary } });

export const Button = () => (
	<button
		onClick={() => {
			// eslint-disable-next-line no-alert -- temporary for testing client boundaries
			alert("Hello world");
		}}
		type="button"
		{...stylex.props(styles.root)}
	>
		Click me!
	</button>
);
