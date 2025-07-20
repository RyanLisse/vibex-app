import type { Meta, StoryObj } from "@storybook/nextjs";
import { StreamingIndicator } from "@/components/streaming-indicator";

const meta = {
	title: "Components/StreamingIndicator",
	component: StreamingIndicator,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"An indicator component that shows streaming status with animated dots.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		isStreaming: {
			control: "boolean",
			description: "Whether the streaming indicator is active",
		},
	},
} satisfies Meta<typeof StreamingIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		isStreaming: true,
	},
};

export const NotStreaming: Story = {
	args: {
		isStreaming: false,
	},
};

export const WithCustomText: Story = {
	args: {
		isStreaming: true,
	},
	render: (args) => (
		<div className="rounded-lg bg-muted p-4">
			<StreamingIndicator {...args} />
		</div>
	),
};
