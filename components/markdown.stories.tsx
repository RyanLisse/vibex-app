import type { Meta, StoryObj } from "@storybook/react";
import { Markdown } from "./markdown";

const meta: Meta<typeof Markdown> = {
	title: "Components/Markdown",
	component: Markdown,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: `# Hello World

This is a **markdown** component with *italic* text.

## Features

- Code blocks
- Lists
- Links
- And more!

\`\`\`typescript
const example = "Hello, world!";
console.log(example);
\`\`\`
`,
	},
};

export const WithCodeBlock: Story = {
	args: {
		children: `# Code Example

Here's a TypeScript example:

\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}

const user: User = {
  id: "1",
  name: "John Doe",
  email: "john@example.com"
};
\`\`\`
`,
	},
};

export const WithTable: Story = {
	args: {
		children: `# Data Table

| Name | Age | City |
|------|-----|------|
| Alice | 30 | New York |
| Bob | 25 | San Francisco |
| Charlie | 35 | Chicago |
`,
	},
};
