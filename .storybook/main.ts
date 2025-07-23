import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
	stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)", "../components/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: [
		"@storybook/addon-docs",
	],
	framework: {
		name: "@storybook/nextjs-vite",
		options: {},
	},
	typescript: {
		check: false,
		reactDocgen: false,
	},
	core: {
		disableTelemetry: true,
	},
};

export default config;
