/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Components to be implemented
import { PRStatusCard } from '../../../components/features/pr-integration/pr-status-card'
import { PRStatusBadge } from '../../../components/features/pr-integration/pr-status-badge'
import { PRReviewSummary } from '../../../components/features/pr-integration/pr-review-summary'
import { PRActionButtons } from '../../../components/features/pr-integration/pr-action-buttons'
import { TaskPRLinker } from '../../../components/features/pr-integration/task-pr-linker'

// Types
import type { PRStatus, TaskPRLink } from '../../../src/schemas/enhanced-task-schemas'

// Mock GitHub API
const mockGitHubAPI = {
  getPullRequest: vi.fn(),
  updatePullRequest: vi.fn(),
  mergePullRequest: vi.fn(),
  requestReview: vi.fn(),
  getPullRequestChecks: vi.fn(),
}

vi.mock('@/lib/github-api', () => ({
  githubAPI: mockGitHubAPI,
}))

// Mock data
const mockPRStatus: PRStatus = {
  prId: 'pr-123',
  title: 'Fix login bug and improve validation',
  status: 'open',
  reviewStatus: 'pending',
  checks: [
    { name: 'CI/CD Pipeline', status: 'success', conclusion: 'success' },
    { name: 'Code Quality', status: 'success', conclusion: 'success' },
    { name: 'Security Scan', status: 'pending' },
  ],
  reviewers: [
    { login: 'jane-reviewer', status: 'requested' },
    { login: 'john-lead', status: 'approved' },
  ],
  mergeable: false, // Blocked by pending checks
}

const mockTaskPRLink: TaskPRLink = {
  taskId: 'task-456',
  prId: 'pr-123',
  repository: 'company/web-app',
  branch: 'feature/fix-login-bug',
  autoUpdateStatus: true,
}

describe('PR Status Integration Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('PRStatusCard', () => {
    it('should render PR status card with all information', () => {
      render(<PRStatusCard prStatus={mockPRStatus} taskPRLink={mockTaskPRLink} />)

      expect(screen.getByText('Fix login bug and improve validation')).toBeInTheDocument()
      expect(screen.getByText('PR #123')).toBeInTheDocument()
      expect(screen.getByText('company/web-app')).toBeInTheDocument()
      expect(screen.getByText('feature/fix-login-bug')).toBeInTheDocument()
    })

    it('should display PR status with appropriate styling', () => {
      render(<PRStatusCard prStatus={mockPRStatus} taskPRLink={mockTaskPRLink} />)

      const statusBadge = screen.getByTestId('pr-status-badge')
      expect(statusBadge).toHaveTextContent('Open')
      expect(statusBadge).toHaveClass('status-open')
    })

    it('should show review status and progress', () => {
      render(<PRStatusCard prStatus={mockPRStatus} taskPRLink={mockTaskPRLink} />)

      expect(screen.getByText('Review Pending')).toBeInTheDocument()
      expect(screen.getByText('1 of 2 approved')).toBeInTheDocument()
    })

    it('should display check status with details', () => {
      render(<PRStatusCard prStatus={mockPRStatus} taskPRLink={mockTaskPRLink} />)

      expect(screen.getByText('CI/CD Pipeline')).toBeInTheDocument()
      expect(screen.getByText('Code Quality')).toBeInTheDocument()
      expect(screen.getByText('Security Scan')).toBeInTheDocument()

      // Check status indicators
      expect(screen.getAllByTestId('check-success')).toHaveLength(2)
      expect(screen.getByTestId('check-pending')).toBeInTheDocument()
    })

    it('should show merge readiness indicator', () => {
      render(<PRStatusCard prStatus={mockPRStatus} taskPRLink={mockTaskPRLink} />)

      expect(screen.getByText(/not ready to merge/i)).toBeInTheDocument()
      expect(screen.getByTestId('merge-blocked')).toBeInTheDocument()
    })

    it('should indicate when PR is ready to merge', () => {
      const readyPR: PRStatus = {
        ...mockPRStatus,
        reviewStatus: 'approved',
        checks: mockPRStatus.checks.map((check) => ({
          ...check,
          status: 'success',
          conclusion: 'success',
        })),
        mergeable: true,
      }

      render(<PRStatusCard prStatus={readyPR} taskPRLink={mockTaskPRLink} />)

      expect(screen.getByText(/ready to merge/i)).toBeInTheDocument()
      expect(screen.getByTestId('merge-ready')).toBeInTheDocument()
    })

    it('should provide quick links to GitHub PR', () => {
      render(<PRStatusCard prStatus={mockPRStatus} taskPRLink={mockTaskPRLink} />)

      const githubLink = screen.getByRole('link', { name: /view on github/i })
      expect(githubLink).toHaveAttribute('href', 'https://github.com/company/web-app/pull/123')
    })
  })

  describe('PRStatusBadge', () => {
    it('should render different status badges', () => {
      const statuses: PRStatus['status'][] = ['draft', 'open', 'merged', 'closed']

      statuses.forEach((status) => {
        const { rerender } = render(<PRStatusBadge status={status} reviewStatus="pending" />)

        expect(screen.getByTestId('pr-status-badge')).toHaveClass(`status-${status}`)

        rerender(<div />)
      })
    })

    it('should show review status for open PRs', () => {
      render(<PRStatusBadge status="open" reviewStatus="approved" />)

      expect(screen.getByText(/approved/i)).toBeInTheDocument()
      expect(screen.getByTestId('review-status')).toHaveClass('review-approved')
    })

    it('should indicate changes requested', () => {
      render(<PRStatusBadge status="open" reviewStatus="changes_requested" />)

      expect(screen.getByText(/changes requested/i)).toBeInTheDocument()
      expect(screen.getByTestId('review-status')).toHaveClass('review-changes-requested')
    })
  })

  describe('PRReviewSummary', () => {
    it('should show review progress and comments', () => {
      render(<PRReviewSummary prStatus={mockPRStatus} />)

      expect(screen.getByText('Reviews (1/2)')).toBeInTheDocument()
      expect(screen.getByText('jane-reviewer')).toBeInTheDocument()
      expect(screen.getByText('john-lead')).toBeInTheDocument()
    })

    it('should display reviewer avatars and status', () => {
      render(<PRReviewSummary prStatus={mockPRStatus} />)

      const reviewers = screen.getAllByTestId(/reviewer-/)
      expect(reviewers).toHaveLength(2)

      expect(screen.getByTestId('reviewer-jane-reviewer')).toHaveClass('status-requested')
      expect(screen.getByTestId('reviewer-john-lead')).toHaveClass('status-approved')
    })

    it('should show review comments and feedback', async () => {
      const prWithComments = {
        ...mockPRStatus,
        reviewComments: [
          {
            id: 'comment-1',
            author: 'jane-reviewer',
            body: 'Please add more error handling here',
            line: 42,
            file: 'src/auth.ts',
          },
        ],
      }

      render(<PRReviewSummary prStatus={prWithComments} />)

      const commentsButton = screen.getByText(/view comments/i)
      await userEvent.click(commentsButton)

      expect(screen.getByText('Please add more error handling here')).toBeInTheDocument()
      expect(screen.getByText('src/auth.ts:42')).toBeInTheDocument()
    })

    it('should allow requesting additional reviews', async () => {
      const mockOnRequestReview = vi.fn()

      render(<PRReviewSummary prStatus={mockPRStatus} onRequestReview={mockOnRequestReview} />)

      const requestReviewButton = screen.getByText(/request review/i)
      await userEvent.click(requestReviewButton)

      // Should open reviewer selection modal
      expect(screen.getByText(/select reviewers/i)).toBeInTheDocument()

      const reviewerOption = screen.getByText('sarah-expert')
      await userEvent.click(reviewerOption)

      const confirmButton = screen.getByText(/send request/i)
      await userEvent.click(confirmButton)

      expect(mockOnRequestReview).toHaveBeenCalledWith(['sarah-expert'])
    })
  })

  describe('PRActionButtons', () => {
    it('should render action buttons based on PR status', () => {
      render(<PRActionButtons prStatus={mockPRStatus} onMerge={vi.fn()} onUpdate={vi.fn()} />)

      expect(screen.getByText(/view pr/i)).toBeInTheDocument()
      expect(screen.getByText(/refresh status/i)).toBeInTheDocument()

      // Merge button should be disabled since PR is not ready
      const mergeButton = screen.getByText(/merge pr/i)
      expect(mergeButton).toBeDisabled()
    })

    it('should enable merge button when PR is ready', () => {
      const readyPR: PRStatus = {
        ...mockPRStatus,
        reviewStatus: 'approved',
        mergeable: true,
        checks: mockPRStatus.checks.map((check) => ({
          ...check,
          status: 'success',
        })),
      }

      render(<PRActionButtons prStatus={readyPR} onMerge={vi.fn()} onUpdate={vi.fn()} />)

      const mergeButton = screen.getByText(/merge pr/i)
      expect(mergeButton).not.toBeDisabled()
    })

    it('should handle PR merge action', async () => {
      const mockOnMerge = vi.fn()
      const readyPR: PRStatus = {
        ...mockPRStatus,
        reviewStatus: 'approved',
        mergeable: true,
      }

      render(<PRActionButtons prStatus={readyPR} onMerge={mockOnMerge} onUpdate={vi.fn()} />)

      const mergeButton = screen.getByText(/merge pr/i)
      await userEvent.click(mergeButton)

      // Should show confirmation dialog
      expect(screen.getByText(/confirm merge/i)).toBeInTheDocument()

      const confirmButton = screen.getByText(/yes, merge/i)
      await userEvent.click(confirmButton)

      expect(mockOnMerge).toHaveBeenCalledWith(mockPRStatus.prId)
    })

    it('should refresh PR status', async () => {
      const mockOnUpdate = vi.fn()

      render(<PRActionButtons prStatus={mockPRStatus} onMerge={vi.fn()} onUpdate={mockOnUpdate} />)

      const refreshButton = screen.getByText(/refresh status/i)
      await userEvent.click(refreshButton)

      expect(mockOnUpdate).toHaveBeenCalledWith(mockPRStatus.prId)
    })
  })

  describe('TaskPRLinker', () => {
    it('should allow linking tasks to PRs', async () => {
      const mockOnLink = vi.fn()

      render(<TaskPRLinker taskId="task-456" onLink={mockOnLink} />)

      const linkButton = screen.getByText(/link pr/i)
      await userEvent.click(linkButton)

      // Should show PR linking form
      expect(screen.getByLabelText(/repository/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/pr number/i)).toBeInTheDocument()

      // Fill form
      await userEvent.type(screen.getByLabelText(/repository/i), 'company/web-app')
      await userEvent.type(screen.getByLabelText(/pr number/i), '123')

      const submitButton = screen.getByText(/link pr/i)
      await userEvent.click(submitButton)

      expect(mockOnLink).toHaveBeenCalledWith({
        taskId: 'task-456',
        repository: 'company/web-app',
        prNumber: '123',
        autoUpdateStatus: true,
      })
    })

    it('should auto-detect PR from branch name', async () => {
      render(
        <TaskPRLinker
          taskId="task-456"
          currentBranch="feature/task-456-fix-login"
          onLink={vi.fn()}
        />
      )

      const autoDetectButton = screen.getByText(/auto-detect pr/i)
      await userEvent.click(autoDetectButton)

      // Should search for PRs with the branch name
      expect(mockGitHubAPI.getPullRequest).toHaveBeenCalledWith({
        head: 'feature/task-456-fix-login',
      })
    })

    it('should show existing PR links', () => {
      render(<TaskPRLinker taskId="task-456" existingLinks={[mockTaskPRLink]} onLink={vi.fn()} />)

      expect(screen.getByText('Linked PRs (1)')).toBeInTheDocument()
      expect(screen.getByText('PR #123')).toBeInTheDocument()
      expect(screen.getByText('company/web-app')).toBeInTheDocument()
    })

    it('should allow unlinking PRs', async () => {
      const mockOnUnlink = vi.fn()

      render(
        <TaskPRLinker
          taskId="task-456"
          existingLinks={[mockTaskPRLink]}
          onLink={vi.fn()}
          onUnlink={mockOnUnlink}
        />
      )

      const unlinkButton = screen.getByText(/unlink/i)
      await userEvent.click(unlinkButton)

      expect(mockOnUnlink).toHaveBeenCalledWith(mockTaskPRLink.prId)
    })
  })

  describe('Automatic Status Updates', () => {
    it('should update task status when PR is merged', async () => {
      const mockUpdateTaskStatus = vi.fn()

      // Simulate webhook or polling update
      const mergedPR: PRStatus = {
        ...mockPRStatus,
        status: 'merged',
      }

      render(
        <PRStatusCard
          prStatus={mergedPR}
          taskPRLink={mockTaskPRLink}
          onTaskStatusUpdate={mockUpdateTaskStatus}
        />
      )

      await waitFor(() => {
        expect(mockUpdateTaskStatus).toHaveBeenCalledWith('task-456', 'completed')
      })
    })

    it('should notify assignee when PR is ready to merge', async () => {
      const mockNotifyAssignee = vi.fn()
      const readyPR: PRStatus = {
        ...mockPRStatus,
        reviewStatus: 'approved',
        mergeable: true,
        checks: mockPRStatus.checks.map((check) => ({
          ...check,
          status: 'success',
        })),
      }

      render(
        <PRStatusCard
          prStatus={readyPR}
          taskPRLink={mockTaskPRLink}
          onNotifyAssignee={mockNotifyAssignee}
        />
      )

      await waitFor(() => {
        expect(mockNotifyAssignee).toHaveBeenCalledWith('task-456', 'PR is ready to merge')
      })
    })

    it('should handle PR status changes from webhooks', async () => {
      const { rerender } = render(
        <PRStatusCard prStatus={mockPRStatus} taskPRLink={mockTaskPRLink} />
      )

      // Simulate webhook update
      const updatedPR: PRStatus = {
        ...mockPRStatus,
        reviewStatus: 'approved',
        reviewers: [
          { login: 'jane-reviewer', status: 'approved' },
          { login: 'john-lead', status: 'approved' },
        ],
      }

      rerender(<PRStatusCard prStatus={updatedPR} taskPRLink={mockTaskPRLink} />)

      expect(screen.getByText('Review Approved')).toBeInTheDocument()
      expect(screen.getByText('2 of 2 approved')).toBeInTheDocument()
    })
  })

  describe('GitHub API Integration', () => {
    it('should fetch PR data from GitHub API', async () => {
      mockGitHubAPI.getPullRequest.mockResolvedValue({
        number: 123,
        title: 'Fix login bug',
        state: 'open',
        mergeable: true,
        reviews: [],
        checks: [],
      })

      render(<PRStatusCard prStatus={mockPRStatus} taskPRLink={mockTaskPRLink} refreshOnMount />)

      await waitFor(() => {
        expect(mockGitHubAPI.getPullRequest).toHaveBeenCalledWith('company/web-app', 123)
      })
    })

    it('should handle GitHub API errors gracefully', async () => {
      mockGitHubAPI.getPullRequest.mockRejectedValue(new Error('API rate limit'))

      render(<PRStatusCard prStatus={mockPRStatus} taskPRLink={mockTaskPRLink} refreshOnMount />)

      await waitFor(() => {
        expect(screen.getByText(/unable to fetch pr status/i)).toBeInTheDocument()
      })
    })

    it('should respect API rate limits', async () => {
      mockGitHubAPI.getPullRequest.mockRejectedValue(new Error('API rate limit exceeded'))

      render(<PRStatusCard prStatus={mockPRStatus} taskPRLink={mockTaskPRLink} refreshOnMount />)

      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument()
      })
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete PR integration workflow', async () => {
      const mockCreateTaskPRLink = vi.fn()
      const mockUpdateTaskStatus = vi.fn()

      // Start with task linking
      render(
        <div>
          <TaskPRLinker taskId="task-456" onLink={mockCreateTaskPRLink} />
        </div>
      )

      // Link PR to task
      const linkButton = screen.getByText(/link pr/i)
      await userEvent.click(linkButton)

      await userEvent.type(screen.getByLabelText(/repository/i), 'company/web-app')
      await userEvent.type(screen.getByLabelText(/pr number/i), '123')

      const submitButton = screen.getByText(/link pr/i)
      await userEvent.click(submitButton)

      expect(mockCreateTaskPRLink).toHaveBeenCalled()

      // Now show PR status
      const { rerender } = render(
        <PRStatusCard
          prStatus={mockPRStatus}
          taskPRLink={mockTaskPRLink}
          onTaskStatusUpdate={mockUpdateTaskStatus}
        />
      )

      // Simulate PR merge
      const mergedPR: PRStatus = {
        ...mockPRStatus,
        status: 'merged',
      }

      rerender(
        <PRStatusCard
          prStatus={mergedPR}
          taskPRLink={mockTaskPRLink}
          onTaskStatusUpdate={mockUpdateTaskStatus}
        />
      )

      await waitFor(() => {
        expect(mockUpdateTaskStatus).toHaveBeenCalledWith('task-456', 'completed')
      })
    })
  })
})
