import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import {
  AIBranch,
  AIBranchMessages,
  AIBranchNext,
  AIBranchPage,
  AIBranchPrevious,
  AIBranchSelector,
} from './branch'

// Mock the Button component
vi.mock('/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, 'aria-label': ariaLabel, ...props }: any) => (
    <button
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  ),
}))

// Mock the cn utility
vi.mock('/lib/utils', () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' ')),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ChevronLeftIcon: ({ size }: { size: number }) => (
    <span data-size={size} data-testid="chevron-left" />
  ),
  ChevronRightIcon: ({ size }: { size: number }) => (
    <span data-size={size} data-testid="chevron-right" />
  ),
}))

describe('AIBranch Components', () => {
  describe('AIBranch', () => {
    it('renders with default props', () => {
      render(
        <AIBranch>
          <div>Content</div>
        </AIBranch>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('calls onBranchChange when branch changes', () => {
      const onBranchChange = vi.fn()

      render(
        <AIBranch onBranchChange={onBranchChange}>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchPrevious />
            <AIBranchNext />
          </AIBranchSelector>
        </AIBranch>
      )

      const nextButton = screen.getByLabelText('Next branch')
      fireEvent.click(nextButton)

      expect(onBranchChange).toHaveBeenCalledWith(1)
    })

    it('starts with default branch', () => {
      render(
        <AIBranch defaultBranch={1}>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
          </AIBranchMessages>
          <AIBranchPage />
        </AIBranch>
      )

      expect(screen.getByText('2 of 2')).toBeInTheDocument()
    })

    it('throws error when components used outside context', () => {
      // Suppress console.error for this test
      const originalError = console.error
      console.error = vi.fn()

      expect(() => {
        render(<AIBranchPrevious />)
      }).toThrow('AIBranch components must be used within AIBranch')

      console.error = originalError
    })
  })

  describe('AIBranchMessages', () => {
    it('renders multiple branches correctly', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
            <div>Branch 3</div>
          </AIBranchMessages>
        </AIBranch>
      )

      // Only the first branch should be visible initially
      expect(screen.getByText('Branch 1')).toBeInTheDocument()
      expect(screen.queryByText('Branch 2')).not.toBeVisible()
      expect(screen.queryByText('Branch 3')).not.toBeVisible()
    })

    it('renders single branch correctly', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Single Branch</div>
          </AIBranchMessages>
        </AIBranch>
      )

      expect(screen.getByText('Single Branch')).toBeInTheDocument()
    })

    it('switches between branches correctly', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchNext />
          </AIBranchSelector>
        </AIBranch>
      )

      expect(screen.getByText('Branch 1')).toBeInTheDocument()
      expect(screen.queryByText('Branch 2')).not.toBeVisible()

      fireEvent.click(screen.getByLabelText('Next branch'))

      expect(screen.queryByText('Branch 1')).not.toBeVisible()
      expect(screen.getByText('Branch 2')).toBeInTheDocument()
    })
  })

  describe('AIBranchSelector', () => {
    it('renders with assistant alignment', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <div>Controls</div>
          </AIBranchSelector>
        </AIBranch>
      )

      const selector = screen.getByText('Controls').parentElement
      expect(selector).toHaveClass('justify-start')
    })

    it('renders with user alignment', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
          </AIBranchMessages>
          <AIBranchSelector from="user">
            <div>Controls</div>
          </AIBranchSelector>
        </AIBranch>
      )

      const selector = screen.getByText('Controls').parentElement
      expect(selector).toHaveClass('justify-end')
    })

    it('does not render with single branch', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <div>Controls</div>
          </AIBranchSelector>
        </AIBranch>
      )

      expect(screen.queryByText('Controls')).not.toBeInTheDocument()
    })
  })

  describe('AIBranchPrevious', () => {
    it('renders with default icon', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchPrevious />
          </AIBranchSelector>
        </AIBranch>
      )

      expect(screen.getByTestId('chevron-left')).toBeInTheDocument()
    })

    it('renders with custom children', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchPrevious>Custom Previous</AIBranchPrevious>
          </AIBranchSelector>
        </AIBranch>
      )

      expect(screen.getByText('Custom Previous')).toBeInTheDocument()
    })

    it('navigates to previous branch', () => {
      render(
        <AIBranch defaultBranch={1}>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchPrevious />
          </AIBranchSelector>
          <AIBranchPage />
        </AIBranch>
      )

      expect(screen.getByText('2 of 2')).toBeInTheDocument()

      fireEvent.click(screen.getByLabelText('Previous branch'))

      expect(screen.getByText('1 of 2')).toBeInTheDocument()
    })

    it('wraps to last branch from first', () => {
      render(
        <AIBranch defaultBranch={0}>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
            <div>Branch 3</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchPrevious />
          </AIBranchSelector>
          <AIBranchPage />
        </AIBranch>
      )

      expect(screen.getByText('1 of 3')).toBeInTheDocument()

      fireEvent.click(screen.getByLabelText('Previous branch'))

      expect(screen.getByText('3 of 3')).toBeInTheDocument()
    })

    it('is disabled with single branch', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchPrevious />
          </AIBranchSelector>
        </AIBranch>
      )

      // Selector should not render with single branch
      expect(screen.queryByLabelText('Previous branch')).not.toBeInTheDocument()
    })
  })

  describe('AIBranchNext', () => {
    it('renders with default icon', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchNext />
          </AIBranchSelector>
        </AIBranch>
      )

      expect(screen.getByTestId('chevron-right')).toBeInTheDocument()
    })

    it('renders with custom children', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchNext>Custom Next</AIBranchNext>
          </AIBranchSelector>
        </AIBranch>
      )

      expect(screen.getByText('Custom Next')).toBeInTheDocument()
    })

    it('navigates to next branch', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchNext />
          </AIBranchSelector>
          <AIBranchPage />
        </AIBranch>
      )

      expect(screen.getByText('1 of 2')).toBeInTheDocument()

      fireEvent.click(screen.getByLabelText('Next branch'))

      expect(screen.getByText('2 of 2')).toBeInTheDocument()
    })

    it('wraps to first branch from last', () => {
      render(
        <AIBranch defaultBranch={2}>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
            <div>Branch 3</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchNext />
          </AIBranchSelector>
          <AIBranchPage />
        </AIBranch>
      )

      expect(screen.getByText('3 of 3')).toBeInTheDocument()

      fireEvent.click(screen.getByLabelText('Next branch'))

      expect(screen.getByText('1 of 3')).toBeInTheDocument()
    })
  })

  describe('AIBranchPage', () => {
    it('displays correct page information', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
            <div>Branch 3</div>
          </AIBranchMessages>
          <AIBranchPage />
        </AIBranch>
      )

      expect(screen.getByText('1 of 3')).toBeInTheDocument()
    })

    it('updates when branch changes', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchNext />
          </AIBranchSelector>
          <AIBranchPage />
        </AIBranch>
      )

      expect(screen.getByText('1 of 2')).toBeInTheDocument()

      fireEvent.click(screen.getByLabelText('Next branch'))

      expect(screen.getByText('2 of 2')).toBeInTheDocument()
    })

    it('handles single branch', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
          </AIBranchMessages>
          <AIBranchPage />
        </AIBranch>
      )

      expect(screen.getByText('1 of 1')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
          </AIBranchMessages>
          <AIBranchPage className="custom-class" />
        </AIBranch>
      )

      const pageElement = screen.getByText('1 of 1')
      expect(pageElement).toHaveClass('custom-class')
    })
  })

  describe('Integration', () => {
    it('works with complete branch navigation', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
            <div>Branch 3</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchPrevious />
            <AIBranchPage />
            <AIBranchNext />
          </AIBranchSelector>
        </AIBranch>
      )

      // Initial state
      expect(screen.getByText('Branch 1')).toBeInTheDocument()
      expect(screen.getByText('1 of 3')).toBeInTheDocument()

      // Navigate forward
      fireEvent.click(screen.getByLabelText('Next branch'))
      expect(screen.getByText('Branch 2')).toBeInTheDocument()
      expect(screen.getByText('2 of 3')).toBeInTheDocument()

      // Navigate forward again
      fireEvent.click(screen.getByLabelText('Next branch'))
      expect(screen.getByText('Branch 3')).toBeInTheDocument()
      expect(screen.getByText('3 of 3')).toBeInTheDocument()

      // Navigate backward
      fireEvent.click(screen.getByLabelText('Previous branch'))
      expect(screen.getByText('Branch 2')).toBeInTheDocument()
      expect(screen.getByText('2 of 3')).toBeInTheDocument()
    })

    it('handles dynamic branch addition', () => {
      const { rerender } = render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
          </AIBranchMessages>
          <AIBranchPage />
        </AIBranch>
      )

      expect(screen.getByText('1 of 1')).toBeInTheDocument()

      // Add more branches
      rerender(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchNext />
          </AIBranchSelector>
          <AIBranchPage />
        </AIBranch>
      )

      expect(screen.getByText('1 of 2')).toBeInTheDocument()
      expect(screen.getByLabelText('Next branch')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
            <div>Branch 2</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchPrevious />
            <AIBranchNext />
          </AIBranchSelector>
        </AIBranch>
      )

      expect(screen.getByLabelText('Previous branch')).toBeInTheDocument()
      expect(screen.getByLabelText('Next branch')).toBeInTheDocument()
    })

    it('disables navigation buttons appropriately', () => {
      render(
        <AIBranch>
          <AIBranchMessages>
            <div>Branch 1</div>
          </AIBranchMessages>
          <AIBranchSelector from="assistant">
            <AIBranchPrevious />
            <AIBranchNext />
          </AIBranchSelector>
        </AIBranch>
      )

      // With single branch, selector should not render
      expect(screen.queryByLabelText('Previous branch')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Next branch')).not.toBeInTheDocument()
    })
  })
})
