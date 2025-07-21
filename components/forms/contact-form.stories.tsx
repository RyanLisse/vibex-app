import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ContactForm } from "./contact-form";

const meta: Meta<typeof ContactForm> = {
	title: "Forms/ContactForm",
	component: ContactForm,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		isLoading: { control: "boolean" },
		className: { control: "text" },
	},
	args: {
		onSubmit: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		isLoading: false,
	},
};

export const Loading: Story = {
	args: {
		isLoading: true,
	},
};

export const WithCustomClassName: Story = {
	args: {
		isLoading: false,
		className: "border p-4 rounded-lg",
	},
};
