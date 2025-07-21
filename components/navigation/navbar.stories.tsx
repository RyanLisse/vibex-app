import type { Meta, StoryObj } from "@storybook/react";
import Navbar from "./navbar";

const meta: Meta<typeof Navbar> = {
	title: "Navigation/Navbar",
	component: Navbar,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
