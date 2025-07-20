import type { Meta, StoryObj } from "@storybook/nextjs";
import { Button } from "@/src/stories/Button";

// This default export determines where your story goes in the story list
const meta: Meta<typeof Button> = {
	title: "Components/Button",
	component: Button,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
	args: {
		primary: true,
		label: "Button",
	},
};

export const Secondary: Story = {
	args: {
		label: "Button",
	},
};

export const Large: Story = {
	args: {
		size: "large",
		label: "Button",
	},
};

export const Small: Story = {
	args: {
		size: "small",
		label: "Button",
	},
};
