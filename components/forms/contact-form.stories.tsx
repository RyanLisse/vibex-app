import type { Meta, StoryObj } from "@storybook/nextjs";
import { ContactForm } from "@/components/forms/contact-form";

const meta = {
	title: "Components/Forms/ContactForm",
	component: ContactForm,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"A contact form component with validation and submission handling.",
			},
		},
	},
	tags: ["autodocs"],
} satisfies Meta<typeof ContactForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		onSubmit: async (_data) => {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		},
		isLoading: false,
	},
};

export const WithInitialValues: Story = {
	args: {
		onSubmit: async (_data) => {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		},
		isLoading: false,
	},
	render: (args) => (
		<div className="mx-auto max-w-md rounded-lg border bg-card p-6">
			<ContactForm {...args} />
		</div>
	),
};
