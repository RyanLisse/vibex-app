import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import NewTaskForm from '@/components/forms/new-task-form'

// Mock the hooks
vi.mock('@/hooks/use-github-auth', () => ({
  useGitHubAuth: () => ({
    branches: [
      { name: 'main', isDefault: true },
      { name: 'feature/test', isDefault: false },
    ],
    fetchBranches: vi.fn(),
    isLoading: false,
    error: null,
  }),
}))

vi.mock('@/stores/tasks', () => ({
  useTaskStore: () => ({
    addTask: vi.fn(),
    tasks: [],
  }),
}))

vi.mock('@/stores/environments', () => ({
  useEnvironmentStore: () => ({
    environments: [
      {
        id: 'env-1',
        name: 'Test Environment',
        githubRepository: 'test/repo',
      },
    ],
  }),
}))

vi.mock('@/app/actions/inngest', () => ({
  createTaskAction: vi.fn(),
}))

vi.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
  return { default: MockLink }
})

describe('NewTaskForm', () => {
  it('renders form elements correctly', () => {
    render(<NewTaskForm />)

    expect(screen.getByPlaceholderText(/describe a task you want to ship/i)).toBeInTheDocument()
    expect(screen.getByText(/ready to ship something new/i)).toBeInTheDocument()
    // Initially no action buttons are shown
    expect(screen.queryByRole('button', { name: /code/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ask/i })).not.toBeInTheDocument()
  })

  it('shows action buttons when text is entered', async () => {
    const user = userEvent.setup()
    render(<NewTaskForm />)

    const input = screen.getByPlaceholderText(/describe a task you want to ship/i)

    await user.type(input, 'Test task description')

    expect(screen.getByRole('button', { name: /code/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ask/i })).toBeInTheDocument()
  })

  it('handles task submission with Code button', async () => {
    const user = userEvent.setup()
    render(<NewTaskForm />)

    const input = screen.getByPlaceholderText(/describe a task you want to ship/i)

    await user.type(input, 'Test task description')

    const codeButton = screen.getByRole('button', { name: /code/i })
    await user.click(codeButton)

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('handles task submission with Ask button', async () => {
    const user = userEvent.setup()
    render(<NewTaskForm />)

    const input = screen.getByPlaceholderText(/describe a task you want to ship/i)

    await user.type(input, 'Test task description')

    const askButton = screen.getByRole('button', { name: /ask/i })
    await user.click(askButton)

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })
})
