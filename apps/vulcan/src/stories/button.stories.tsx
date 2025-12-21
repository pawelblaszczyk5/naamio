import { fn } from "storybook/test";

import { Button } from "@naamio/design-system/components/button";

import preview from "#storybook/preview.js";

const meta = preview.meta({ component: Button });

export const Base = meta.story({ args: { onClick: fn() } });
