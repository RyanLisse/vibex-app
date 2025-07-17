import type { Meta, StoryObj } from '@storybook/react'
import TaskList from './task-list'

const meta = {
  title: 'Components/TaskList',
  component: TaskList,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A component that displays a list of tasks with their statuses.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TaskList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithTasks: Story = {
  render: () => (
    <div className="p-4">
      <TaskList />
    </div>
  ),
}
