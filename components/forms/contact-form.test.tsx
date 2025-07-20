import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ContactForm } from './contact-form'

describe('ContactForm', () => {
  const mockOnSubmit = vi.fn()
  const defaultProps = {
    onSubmit: mockOnSubmit,
  }

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  describe('Rendering', () => {
    it('renders all form fields', () => {
      render(<ContactForm {...defaultProps} />)

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    })

    it('renders submit and clear buttons', () => {
      render(<ContactForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('has correct default values', () => {
      render(<ContactForm {...defaultProps} />)

      expect(screen.getByLabelText(/name/i)).toHaveValue('')
      expect(screen.getByLabelText(/email/i)).toHaveValue('')
      expect(screen.getByLabelText(/subject/i)).toHaveValue('')
      expect(screen.getByLabelText(/message/i)).toHaveValue('')
      expect(screen.getByLabelText(/priority/i)).toHaveValue('medium')
    })

    it('applies custom className', () => {
      const { container } = render(<ContactForm {...defaultProps} className="custom-form" />)

      expect(container.firstChild).toHaveClass('custom-form')
    })
  })

  describe('Form Validation', () => {
    it('shows validation errors on submit with empty fields', async () => {
      render(<ContactForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', {
        name: /send message/i,
      })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument()
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
        expect(screen.getByText(/subject must be at least 5 characters/i)).toBeInTheDocument()
        expect(screen.getByText(/message must be at least 10 characters/i)).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('validates email format', async () => {
      render(<ContactForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      await userEvent.type(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', {
        name: /send message/i,
      })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    it('validates minimum field lengths', async () => {
      render(<ContactForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      const subjectInput = screen.getByLabelText(/subject/i)
      const messageInput = screen.getByLabelText(/message/i)

      await userEvent.type(nameInput, 'A') // Too short
      await userEvent.type(subjectInput, 'Test') // Too short
      await userEvent.type(messageInput, 'Short') // Too short

      const submitButton = screen.getByRole('button', {
        name: /send message/i,
      })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument()
        expect(screen.getByText(/subject must be at least 5 characters/i)).toBeInTheDocument()
        expect(screen.getByText(/message must be at least 10 characters/i)).toBeInTheDocument()
      })
    })

    it('submits form with valid data', async () => {
      mockOnSubmit.mockResolvedValue(undefined)

      render(<ContactForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const subjectInput = screen.getByLabelText(/subject/i)
      const messageInput = screen.getByLabelText(/message/i)

      await userEvent.type(nameInput, 'John Doe')
      await userEvent.type(emailInput, 'john@example.com')
      await userEvent.type(subjectInput, 'Test Subject')
      await userEvent.type(messageInput, 'This is a test message with sufficient length.')

      const submitButton = screen.getByRole('button', {
        name: /send message/i,
      })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          subject: 'Test Subject',
          message: 'This is a test message with sufficient length.',
          priority: 'medium',
        })
      })
    })
  })

  describe('Real-time Validation', () => {
    it('clears field errors when user starts typing', async () => {
      render(<ContactForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      const submitButton = screen.getByRole('button', {
        name: /send message/i,
      })

      // Trigger validation error
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument()
      })

      // Start typing to clear error
      await userEvent.type(nameInput, 'John')

      await waitFor(() => {
        expect(screen.queryByText(/name must be at least 2 characters/i)).not.toBeInTheDocument()
      })
    })

    it('shows error styling on invalid fields', async () => {
      render(<ContactForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      const submitButton = screen.getByRole('button', {
        name: /send message/i,
      })

      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(nameInput).toHaveClass('border-red-500')
        expect(nameInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('sets aria-describedby for fields with errors', async () => {
      render(<ContactForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      const submitButton = screen.getByRole('button', {
        name: /send message/i,
      })

      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(nameInput).toHaveAttribute('aria-describedby', 'name-error')
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      render(<ContactForm {...defaultProps} isLoading={true} />)

      const submitButton = screen.getByRole('button', { name: /sending/i })
      expect(submitButton).toBeDisabled()
      expect(screen.getByText(/sending.../i)).toBeInTheDocument()
    })

    it('disables buttons when loading', () => {
      render(<ContactForm {...defaultProps} isLoading={true} />)

      const submitButton = screen.getByRole('button', { name: /sending/i })
      const clearButton = screen.getByRole('button', { name: /clear/i })

      expect(submitButton).toBeDisabled()
      expect(clearButton).toBeDisabled()
    })
  })

  describe('Clear Functionality', () => {
    it('clears form data when clear button is clicked', async () => {
      render(<ContactForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const subjectInput = screen.getByLabelText(/subject/i)
      const messageInput = screen.getByLabelText(/message/i)
      const prioritySelect = screen.getByLabelText(/priority/i)

      // Fill form
      await userEvent.type(nameInput, 'John Doe')
      await userEvent.type(emailInput, 'john@example.com')
      await userEvent.type(subjectInput, 'Test Subject')
      await userEvent.type(messageInput, 'Test message')
      await userEvent.selectOptions(prioritySelect, 'high')

      // Clear form
      const clearButton = screen.getByRole('button', { name: /clear/i })
      await userEvent.click(clearButton)

      expect(nameInput).toHaveValue('')
      expect(emailInput).toHaveValue('')
      expect(subjectInput).toHaveValue('')
      expect(messageInput).toHaveValue('')
      expect(prioritySelect).toHaveValue('medium')
    })

    it('clears validation errors when clear button is clicked', async () => {
      render(<ContactForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', {
        name: /send message/i,
      })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument()
      })

      const clearButton = screen.getByRole('button', { name: /clear/i })
      await userEvent.click(clearButton)

      await waitFor(() => {
        expect(screen.queryByText(/name must be at least 2 characters/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Priority Selection', () => {
    it('allows selecting different priority levels', async () => {
      render(<ContactForm {...defaultProps} />)

      const prioritySelect = screen.getByLabelText(/priority/i)

      await userEvent.selectOptions(prioritySelect, 'high')
      expect(prioritySelect).toHaveValue('high')

      await userEvent.selectOptions(prioritySelect, 'low')
      expect(prioritySelect).toHaveValue('low')
    })

    it('includes priority in form submission', async () => {
      mockOnSubmit.mockResolvedValue(undefined)

      render(<ContactForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const subjectInput = screen.getByLabelText(/subject/i)
      const messageInput = screen.getByLabelText(/message/i)
      const prioritySelect = screen.getByLabelText(/priority/i)

      await userEvent.type(nameInput, 'John Doe')
      await userEvent.type(emailInput, 'john@example.com')
      await userEvent.type(subjectInput, 'Test Subject')
      await userEvent.type(messageInput, 'This is a test message.')
      await userEvent.selectOptions(prioritySelect, 'high')

      const submitButton = screen.getByRole('button', {
        name: /send message/i,
      })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            priority: 'high',
          })
        )
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper labels for all form fields', () => {
      render(<ContactForm {...defaultProps} />)

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    })

    it('has proper error announcements', async () => {
      render(<ContactForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', {
        name: /send message/i,
      })
      await userEvent.click(submitButton)

      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert')
        expect(errorMessages.length).toBeGreaterThan(0)
      })
    })

    it('uses noValidate attribute on form', () => {
      render(<ContactForm {...defaultProps} />)

      const form = document.querySelector('form')
      expect(form).toHaveAttribute('noValidate')
    })
  })
})
