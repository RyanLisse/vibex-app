import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import { createMockTask } from '../../tests/fixtures/tasks'
import { TaskEditForm } from './task-edit-form'

const meta = {
  title: 'Components/Forms/TaskEditForm',
  component: TaskEditForm,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A form component for creating and editing tasks with validation and error handling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submitted' },
    onCancel: { action: 'cancelled' },
    task: {
      description: 'Existing task data for editing mode',
    },
  },
} satisfies Meta<typeof TaskEditForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onSubmit: async (data) => {
      console.log('Form submitted:', data)
    },
    onCancel: () => {
      console.log('Form cancelled')
    },
  },
}

export const EditMode: Story = {
  args: {
    task: createMockTask({
      title: 'Existing Task',
      description: 'This is an existing task that can be edited',
      priority: 'high',
    }),
    onSubmit: async (data) => {
      console.log('Task updated:', data)
    },
    onCancel: () => {
      console.log('Edit cancelled')
    },
  },
}

export const WithError: Story = {
  args: {
    onSubmit: async () => {
      throw new Error('Failed to submit task')
    },
    onCancel: () => {
      console.log('Form cancelled')
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Fill in the form
    await userEvent.type(canvas.getByLabelText(/title/i), 'Test Task')
    await userEvent.type(canvas.getByLabelText(/description/i), 'Test description')

    // Submit the form to trigger error
    await userEvent.click(canvas.getByRole('button', { name: /create task/i }))

    // Wait for error to appear
    await expect(canvas.getByText(/failed to submit task/i)).toBeInTheDocument()
  },
}

export const ValidationErrors: Story = {
  args: {
    onSubmit: async (data) => {
      console.log('Form submitted:', data)
    },
    onCancel: () => {
      console.log('Form cancelled')
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Try to submit without filling required fields
    await userEvent.click(canvas.getByRole('button', { name: /create task/i }))

    // Check for validation error
    await expect(canvas.getByText(/title is required/i)).toBeInTheDocument()
  },
}

export const LongContent: Story = {
  args: {
    task: createMockTask({
      title: 'Very Long Task Title That Might Wrap to Multiple Lines in the Interface',
      description:
        'This is a very long description that contains a lot of text to test how the form handles longer content. It should wrap properly and not break the layout. The description can be quite lengthy and should be displayed correctly in the textarea component.',
      priority: 'medium',
    }),
    onSubmit: async (data) => {
      console.log('Task updated:', data)
    },
    onCancel: () => {
      console.log('Edit cancelled')
    },
  },
}

export const InteractiveForm: Story = {
  args: {
    onSubmit: async (data) => {
      console.log('Form submitted:', data)
    },
    onCancel: () => {
      console.log('Form cancelled')
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Fill in the form step by step
    await userEvent.type(canvas.getByLabelText(/title/i), 'Interactive Test Task')
    await userEvent.type(
      canvas.getByLabelText(/description/i),
      'This task was created through Storybook interactions'
    )

    // Change priority
    await userEvent.selectOptions(canvas.getByLabelText(/priority/i), 'high')

    // Verify the button is enabled
    const submitButton = canvas.getByRole('button', { name: /create task/i })
    await expect(submitButton).toBeEnabled()

    // Submit the form
    await userEvent.click(submitButton)
  },
}

export const LoadingState: Story = {
  args: {
    onSubmit: async (data) => {
      // Simulate a slow network request
      await new Promise((resolve) => setTimeout(resolve, 2000))
      console.log('Form submitted:', data)
    },
    onCancel: () => {
      console.log('Form cancelled')
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Fill in the form
    await userEvent.type(canvas.getByLabelText(/title/i), 'Loading Test Task')

    // Submit the form
    await userEvent.click(canvas.getByRole('button', { name: /create task/i }))

    // Check for loading state
    await expect(canvas.getByText(/submitting/i)).toBeInTheDocument()

    // Check that the button is disabled
    await expect(canvas.getByRole('button', { name: /submitting/i })).toBeDisabled()
  },
}

export const CancelAction: Story = {
  args: {
    onSubmit: async (data) => {
      console.log('Form submitted:', data)
    },
    onCancel: () => {
      console.log('Form cancelled')
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Fill in some data
    await userEvent.type(canvas.getByLabelText(/title/i), 'Task to be cancelled')

    // Click cancel
    await userEvent.click(canvas.getByRole('button', { name: /cancel/i }))
  },
}

export const AllPriorityOptions: Story = {
  args: {
    onSubmit: async (data) => {
      console.log('Form submitted:', data)
    },
    onCancel: () => {
      console.log('Form cancelled')
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Test each priority option
    const prioritySelect = canvas.getByLabelText(/priority/i)

    await userEvent.selectOptions(prioritySelect, 'low')
    await expect(prioritySelect).toHaveValue('low')

    await userEvent.selectOptions(prioritySelect, 'medium')
    await expect(prioritySelect).toHaveValue('medium')

    await userEvent.selectOptions(prioritySelect, 'high')
    await expect(prioritySelect).toHaveValue('high')
  },
}
