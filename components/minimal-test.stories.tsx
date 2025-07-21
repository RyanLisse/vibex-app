import type { Meta, StoryObj } from "@storybook/react";

// Minimal test component placeholder
const MinimalTestComponent = () => {
	return (
		<div className="p-4 border rounded-lg">
			<h3 className="text-lg font-semibold mb-2">Minimal Test Component</h3>
			<p className="text-muted-foreground">
				This is a minimal test component for Storybook demonstration.
			</p>
			<button
				className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				onClick={() => alert("Minimal test clicked!")}
			>
				Test Button
			</button>
		</div>
	);
};

const meta: Meta<typeof MinimalTestComponent> = {
	title: "Test/MinimalTest",
	component: MinimalTestComponent,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
