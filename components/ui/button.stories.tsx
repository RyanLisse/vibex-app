import type { Meta, StoryObj } from "@storybook/nextjs";
import { Download, Heart, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const meta = {
	title: "Components/UI/Button",
	component: Button,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"A versatile button component with multiple variants, sizes, and states.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: [
				"default",
				"destructive",
				"outline",
				"secondary",
				"ghost",
				"link",
			],
			description: "The visual variant of the button",
		},
		size: {
			control: "select",
			options: ["default", "sm", "lg", "icon"],
			description: "The size of the button",
		},
		asChild: {
			control: "boolean",
			description: "Change the rendered element for the button",
		},
		disabled: {
			control: "boolean",
			description: "Whether the button is disabled",
		},
		children: {
			control: "text",
			description: "The content of the button",
		},
	},
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic variants
export const Default: Story = {
	args: {
		children: "Button",
	},
};

export const Destructive: Story = {
	args: {
		variant: "destructive",
		children: "Delete",
	},
};

export const Outline: Story = {
	args: {
		variant: "outline",
		children: "Outline",
	},
};

export const Secondary: Story = {
	args: {
		variant: "secondary",
		children: "Secondary",
	},
};

export const Ghost: Story = {
	args: {
		variant: "ghost",
		children: "Ghost",
	},
};

export const Link: Story = {
	args: {
		variant: "link",
		children: "Link",
	},
};

// Size variations
export const Small: Story = {
	args: {
		size: "sm",
		children: "Small",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		children: "Large",
	},
};

export const Icon: Story = {
	args: {
		size: "icon",
		children: <Heart className="size-4" />,
	},
};

// With icons
export const WithIcon: Story = {
	args: {
		children: (
			<>
				<Download className="size-4" />
				Download
			</>
		),
	},
};

export const WithIconSecondary: Story = {
	args: {
		variant: "secondary",
		children: (
			<>
				<Plus className="size-4" />
				Add Item
			</>
		),
	},
};

export const DestructiveWithIcon: Story = {
	args: {
		variant: "destructive",
		children: (
			<>
				<Trash2 className="size-4" />
				Delete
			</>
		),
	},
};

// States
export const Disabled: Story = {
	args: {
		disabled: true,
		children: "Disabled",
	},
};

export const DisabledWithIcon: Story = {
	args: {
		disabled: true,
		children: (
			<>
				<Download className="size-4" />
				Download
			</>
		),
	},
};

// As child (polymorphic)
export const AsLink: Story = {
	args: {
		asChild: true,
		children: (
			<a href="#" rel="noopener" target="_blank">
				External Link
			</a>
		),
	},
};

// Loading state (custom implementation)
export const Loading: Story = {
	args: {
		disabled: true,
		children: (
			<>
				<div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
				Loading...
			</>
		),
	},
};

// Group of buttons
export const ButtonGroup: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Button>Primary</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="link">Link</Button>
		</div>
	),
};

// Size comparison
export const SizeComparison: Story = {
	render: () => (
		<div className="flex flex-wrap items-center gap-2">
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
			<Button size="icon">
				<Heart className="size-4" />
			</Button>
		</div>
	),
};

// Accessibility example
export const AccessibilityExample: Story = {
	args: {
		"aria-label": "Close dialog",
		"aria-describedby": "button-description",
		children: "×",
	},
	render: (args) => (
		<div>
			<Button {...args} />
			<div
				className="mt-2 text-muted-foreground text-sm"
				id="button-description"
			>
				This button closes the current dialog
			</div>
		</div>
	),
};
