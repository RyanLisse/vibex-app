import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

// Placeholder Button component for the stories
const Button = ({ primary, backgroundColor, size, label, ...props }: any) => {
	const mode = primary ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-900";
	const sizeClass =
		size === "small"
			? "px-2 py-1 text-sm"
			: size === "large"
				? "px-6 py-3 text-lg"
				: "px-4 py-2";

	return (
		<button
			type="button"
			className={`rounded font-medium ${mode} ${sizeClass}`}
			style={{ backgroundColor }}
			{...props}
		>
			{label}
		</button>
	);
};

const meta: Meta<typeof Button> = {
	title: "Example/Button",
	component: Button,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		backgroundColor: { control: "color" },
		size: {
			control: { type: "select" },
			options: ["small", "medium", "large"],
		},
	},
	args: {
		onClick: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

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
