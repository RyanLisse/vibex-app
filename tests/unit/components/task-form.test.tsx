import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
    const { container, getByPlaceholderText, getByText, queryByRole } = render(<NewTaskForm />)

    expect(getByPlaceholderText(/describe a task you want to ship/i)).toBeInTheDocument()
    expect(getByText(/ready to ship something new/i)).toBeInTheDocument()
    // Initially no action buttons are shown
    expect(queryByRole('button', { name: /code/i })).not.toBeInTheDocument()
    expect(queryByRole('button', { name: /ask/i })).not.toBeInTheDocument()
  })

  it('shows action buttons when text is entered', async () => {
    const { getByPlaceholderText, findByText } = render(<NewTaskForm />)

    const input = getByPlaceholderText(/describe a task you want to ship/i) as HTMLTextAreaElement

    // Use fireEvent to trigger onChange directly
    fireEvent.change(input, { target: { value: 'Test task description' } })

    // Wait for buttons to appear after state update
    const codeButton = await findByText('Code')
    const askButton = await findByText('Ask')

    expect(codeButton).toBeInTheDocument()
    expect(askButton).toBeInTheDocument()
  })

  const testTaskSubmission = async (buttonLabel: 'Code' | 'Ask') => {
    const { getByPlaceholderText, findByText } = render(<NewTaskForm />)

    const input = getByPlaceholderText(/describe a task you want to ship/i) as HTMLTextAreaElement

    // Use fireEvent to trigger onChange
    fireEvent.change(input, { target: { value: 'Test task description' } })

    // Wait for button to appear
    const button = await findByText(buttonLabel)
    fireEvent.click(button)

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  }

  it('handles task submission with Code button', async () => {
    await testTaskSubmission('Code')
  })

  it('handles task submission with Ask button', async () => {
    await testTaskSubmission('Ask')
  })
})
