import type { Meta, StoryObj } from "@storybook/react";
import { ExampleItem } from "./ExampleItem";

const meta: Meta<typeof ExampleItem> = {
	title: "Features/ExampleItem",
	component: ExampleItem,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		onEdit: { action: "edit" },
		onDelete: { action: "delete" },
		onStatusChange: { action: "status-change" },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		item: {
			id: "1",
			title: "Example Task",
			description: "This is an example task description",
			status: "pending",
			priority: "medium",
			createdAt: new Date(),
		},
	},
};

export const Completed: Story = {
	args: {
		item: {
			id: "2",
			title: "Completed Task",
			description: "This task has been completed",
			status: "completed",
			priority: "high",
			createdAt: new Date(),
		},
	},
};

export const WithActions: Story = {
	args: {
		item: {
			id: "3",
			title: "Task with Actions",
			description: "This task has edit and delete actions",
			status: "pending",
			priority: "low",
			createdAt: new Date(),
		},
		onEdit: (item) => console.log("Edit:", item),
		onDelete: (id) => console.log("Delete:", id),
		onStatusChange: (id, status) => console.log("Status change:", id, status),
	},
};
