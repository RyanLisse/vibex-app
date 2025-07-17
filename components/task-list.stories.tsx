import type { StoryObj } from '@storybook/nextjs'
import TaskList from './task-list'
import { createStorybookMeta } from './stories/story-base'

const meta = createStorybookMeta(
  TaskList,
  'Components/TaskList',
  'A component that displays a list of tasks with their statuses.'
)

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
