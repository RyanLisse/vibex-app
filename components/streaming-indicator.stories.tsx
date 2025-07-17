import type { Meta, StoryObj } from '@storybook/react'
import { StreamingIndicator } from './streaming-indicator'

const meta = {
  title: 'Components/StreamingIndicator',
  component: StreamingIndicator,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An indicator component that shows streaming status with animated dots.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isStreaming: {
      control: 'boolean',
      description: 'Whether the streaming indicator is active',
    },
  },
} satisfies Meta<typeof StreamingIndicator>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    isStreaming: true,
  },
}

export const NotStreaming: Story = {
  args: {
    isStreaming: false,
  },
}

export const WithCustomText: Story = {
  args: {
    isStreaming: true,
  },
  render: (args) => (
    <div className="p-4 bg-muted rounded-lg">
      <StreamingIndicator {...args} />
    </div>
  ),
}