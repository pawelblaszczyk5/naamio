import addonA11y from "@storybook/addon-a11y";
import addonDocs from "@storybook/addon-docs";
import { definePreview } from "@storybook/react-vite";

import "#src/styles.css";

// cspell:ignore autodocs
const preview = definePreview({ addons: [addonA11y(), addonDocs()], parameters: {}, tags: ["autodocs"] });

export default preview;
