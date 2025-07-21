import type { Meta, StoryObj } from "@storybook/react";
import TaskList from "./task-list";

const meta: Meta<typeof TaskList> = {
	title: "Components/TaskList",
	component: TaskList,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
