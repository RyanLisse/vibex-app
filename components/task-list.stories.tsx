import type { StoryObj } from '@storybook/nextjs'
import { createStorybookMeta } from './stories/story-base'
import TaskList from './task-list'

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
