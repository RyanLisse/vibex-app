import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewTaskForm from '@/components/forms/new-task-form'
import { describe, it, expect, vi } from 'vitest'

// Mock the hooks
vi.mock('@/hooks/use-github-auth', () => ({
  useGitHubAuth: () => ({
    branches: [
      { name: 'main', isDefault: true },
      { name: 'feature/test', isDefault: false }
    ],
    fetchBranches: vi.fn(),
    isLoading: false,
    error: null
  })
}))

vi.mock('@/stores/tasks', () => ({
  useTaskStore: () => ({
    addTask: vi.fn(),
    tasks: [],
  }),
}))

describe('NewTaskForm', () => {
  it('renders form elements correctly', () => {
    render(<NewTaskForm />)

    expect(screen.getByPlaceholderText(/describe a task you want to ship/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument()
  })

  it('handles task submission', async () => {
    const user = userEvent.setup()
    render(<NewTaskForm />)

    const input = screen.getByPlaceholderText(/describe your task/i)
    const submitButton = screen.getByRole('button', { name: /create task/i })

    await user.type(input, 'Test task description')
    await user.click(submitButton)

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<NewTaskForm />)

    const submitButton = screen.getByRole('button', { name: /create task/i })
    await user.click(submitButton)

    expect(screen.getByText(/task description is required/i)).toBeInTheDocument()
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    render(<NewTaskForm />)

    const input = screen.getByPlaceholderText(/describe your task/i)
    const submitButton = screen.getByRole('button', { name: /create task/i })

    await user.type(input, 'Test task')
    await user.click(submitButton)

    expect(screen.getByText(/creating task/i)).toBeInTheDocument()
  })
})
