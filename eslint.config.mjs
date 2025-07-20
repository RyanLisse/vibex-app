// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const eslintConfig = [
	...compat.extends("next/core-web-vitals", "next/typescript"),
	...storybook.configs["flat/recommended"],
	{
		rules: {
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-require-imports": "off",
			"@typescript-eslint/no-unsafe-function-type": "off",
			"react/no-unescaped-entities": "off",
			"react/display-name": "off",
			"react-hooks/exhaustive-deps": "warn",
			"@next/next/no-assign-module-variable": "off",
			"@next/next/no-img-element": "warn",
			"storybook/no-renderer-packages": "off",
		},
	},
];

export default eslintConfig;
