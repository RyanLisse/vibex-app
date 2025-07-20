import type { StorybookConfig } from "@storybook/nextjs-vite";

// Top-level regex for performance
const NODE_MODULES_REGEX = /node_modules/;

const config: StorybookConfig = {
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: [
		"@storybook/addon-essentials",
		"@storybook/addon-interactions",
		"@storybook/addon-vitest",
		"@storybook/addon-a11y",
		"@storybook/addon-coverage",
	],
	framework: {
		name: "@storybook/nextjs-vite",
		options: {},
	},
	staticDirs: ["../public"],
	typescript: {
		check: false,
		reactDocgen: "react-docgen-typescript",
		reactDocgenTypescriptOptions: {
			shouldExtractLiteralValuesFromEnum: true,
			propFilter: (prop) => {
				return prop.parent
					? !NODE_MODULES_REGEX.test(prop.parent.fileName)
					: true;
			},
		},
	},
	features: {
		experimentalRSC: true,
	},
	build: {
		test: {
			disabledAddons: ["@storybook/addon-docs"],
		},
	},
	core: {
		disableTelemetry: true,
	},
	env: (storybookConfig) => ({
		...storybookConfig,
		IS_STORYBOOK: "true",
	}),
};

export default config;
