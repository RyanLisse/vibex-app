import type { Meta, StoryObj } from '@storybook/nextjs'

const TestComponent = () => {
  return <div>Hello Storybook!</div>
}

const meta = {
  title: 'Test/Minimal',
  component: TestComponent,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof TestComponent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
