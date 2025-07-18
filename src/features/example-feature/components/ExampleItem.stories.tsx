import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { ExampleItem } from './ExampleItem'

const meta: Meta<typeof ExampleItem> = {
  title: 'Features/ExampleFeature/ExampleItem',
  component: ExampleItem,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A component that displays an example item with status, priority, and actions.',
      },
    },
  },
  argTypes: {
    item: {
      description: 'The example item to display',
    },
    onEdit: {
      description: 'Callback when the edit button is clicked',
    },
    onDelete: {
      description: 'Callback when the delete button is clicked',
    },
    onStatusChange: {
      description: 'Callback when the status checkbox is toggled',
    },
  },
  args: {
    onEdit: fn(),
    onDelete: fn(),
    onStatusChange: fn(),
  },
}

export default meta
type Story = StoryObj<typeof meta>

const baseItem = {
  id: '1',
  title: 'Example Task',
  description: 'This is an example task for demonstration purposes',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
} as const

export const Pending: Story = {
  args: {
    item: {
      ...baseItem,
      status: 'pending',
      priority: 'medium',
    },
  },
}

export const InProgress: Story = {
  args: {
    item: {
      ...baseItem,
      status: 'in_progress',
      priority: 'high',
    },
  },
}

export const Completed: Story = {
  args: {
    item: {
      ...baseItem,
      status: 'completed',
      priority: 'low',
    },
  },
}

export const HighPriority: Story = {
  args: {
    item: {
      ...baseItem,
      status: 'pending',
      priority: 'high',
      title: 'Critical Bug Fix',
      description: 'Fix the authentication issue that is blocking users',
    },
  },
}

export const LowPriority: Story = {
  args: {
    item: {
      ...baseItem,
      status: 'pending',
      priority: 'low',
      title: 'Update Documentation',
      description: 'Add more examples to the API documentation',
    },
  },
}

export const WithoutDescription: Story = {
  args: {
    item: {
      ...baseItem,
      status: 'pending',
      priority: 'medium',
      description: undefined,
    },
  },
}

export const LongTitle: Story = {
  args: {
    item: {
      ...baseItem,
      status: 'pending',
      priority: 'medium',
      title: 'This is a very long title that should wrap properly and not break the layout',
      description:
        'This item has a very long title to test how the component handles text wrapping',
    },
  },
}

export const WithoutActions: Story = {
  args: {
    item: {
      ...baseItem,
      status: 'pending',
      priority: 'medium',
    },
    onEdit: undefined,
    onDelete: undefined,
    onStatusChange: undefined,
  },
}
