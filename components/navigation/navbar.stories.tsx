import type { StoryObj } from "@storybook/nextjs";
import Navbar from "@/components/navigation/navbar";
import { createStorybookMeta } from "@/components/stories/story-base";

const meta = createStorybookMeta(
	Navbar,
	"Components/Navigation/Navbar",
	"Main navigation bar component with theme toggle and user menu.",
);

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithBackground: Story = {
	render: () => (
		<div className="bg-background">
			<Navbar />
		</div>
	),
};
