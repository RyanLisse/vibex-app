import type { Meta, StoryObj } from "@storybook/react";
import { StreamingIndicator } from "./streaming-indicator";

const meta: Meta<typeof StreamingIndicator> = {
	title: "Components/StreamingIndicator",
	component: StreamingIndicator,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: { type: "select" },
			options: ["dots", "cursor", "wave"],
		},
		size: {
			control: { type: "select" },
			options: ["sm", "md", "lg"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Dots: Story = {
	args: {
		variant: "dots",
	},
};

export const Cursor: Story = {
	args: {
		variant: "cursor",
	},
};

export const Wave: Story = {
	args: {
		variant: "wave",
	},
};

export const Small: Story = {
	args: {
		size: "sm",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
	},
};
