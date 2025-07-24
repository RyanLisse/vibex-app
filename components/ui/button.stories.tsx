import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
	title: "UI/Button",
	component: Button,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: { type: "select" },
			options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
		},
		size: {
			control: { type: "select" },
			options: ["default", "sm", "lg", "icon"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: "Button",
	},
};

export const Secondary: Story = {
	args: {
		variant: "secondary",
		children: "Button",
	},
};

export const Destructive: Story = {
	args: {
		variant: "destructive",
		children: "Button",
	},
};

export const Outline: Story = {
	args: {
		variant: "outline",
		children: "Button",
	},
};

export const Ghost: Story = {
	args: {
		variant: "ghost",
		children: "Button",
	},
};

export const Link: Story = {
	args: {
		variant: "link",
		children: "Button",
	},
};

export const Small: Story = {
	args: {
		size: "sm",
		children: "Button",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		children: "Button",
	},
};

export const Icon: Story = {
	args: {
		size: "icon",
		children: "🚀",
	},
};
