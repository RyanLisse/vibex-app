import type { Meta, StoryObj } from '@storybook/react'
import { Markdown } from './markdown'

const meta = {
  title: 'Components/Markdown',
  component: Markdown,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A markdown renderer component with syntax highlighting and custom styling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'The markdown content to render',
    },
  },
} satisfies Meta<typeof Markdown>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: '# Hello World\n\nThis is a **markdown** example with *italic* text.',
  },
}

export const WithCodeBlock: Story = {
  args: {
    children: `# Code Example

Here's some JavaScript code:

\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

And some inline code: \`const x = 42;\``,
  },
}

export const WithList: Story = {
  args: {
    children: `# Features

- **Bold** text support
- *Italic* text support
- \`Inline code\` support
- Code blocks with syntax highlighting
- Lists and nested lists
  - Nested item 1
  - Nested item 2
- Links and images`,
  },
}

export const WithTable: Story = {
  args: {
    children: `# Data Table

| Name | Age | City |
|------|-----|------|
| John | 30 | New York |
| Jane | 25 | London |
| Bob | 35 | Paris |`,
  },
}

export const WithBlockquote: Story = {
  args: {
    children: `# Quotes

> This is a blockquote with some important information.
> 
> It can span multiple lines and contain **formatting**.

Regular text continues here.`,
  },
}