import preview from "#storybook/preview.js";

const Button = () => <button type="button">Hello world</button>;

const meta = preview.meta({ component: Button });

export const Base = meta.story({});
