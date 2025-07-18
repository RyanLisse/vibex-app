import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FormField } from './form-field'

describe('FormField', () => {
  const defaultProps = {
    id: 'name' as const,
    label: 'Name',
    type: 'text' as const,
    value: '',
    className: 'test-class',
    hasError: false,
    onChange: vi.fn(),
    onBlur: vi.fn(),
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders text input field correctly', () => {
      render(<FormField {...defaultProps} />)

      expect(screen.getByLabelText('Name *')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')
    })

    it('renders email input field correctly', () => {
      render(<FormField {...defaultProps} type="email" />)

      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')
    })

    it('renders textarea field correctly', () => {
      render(<FormField {...defaultProps} rows={5} type="textarea" />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toBeInTheDocument()
      expect(textarea.tagName).toBe('TEXTAREA')
      expect(textarea).toHaveAttribute('rows', '5')
    })

    it('renders select field correctly', () => {
      const options = [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ]
      render(<FormField {...defaultProps} options={options} type="select" />)

      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
      expect(screen.getByText('Low')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
      expect(screen.getByText('High')).toBeInTheDocument()
    })

    it('renders placeholder text', () => {
      render(<FormField {...defaultProps} placeholder="Enter your name" />)

      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
    })

    it('renders required indicator', () => {
      render(<FormField {...defaultProps} required={true} />)

      expect(screen.getByText('Name *')).toBeInTheDocument()
    })

    it('renders without required indicator when not required', () => {
      render(<FormField {...defaultProps} required={false} />)

      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.queryByText('Name *')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('shows error message when hasError is true', () => {
      render(<FormField {...defaultProps} errorMessage="This field is required" hasError={true} />)

      const errorElement = screen.getByRole('alert')
      expect(errorElement).toBeInTheDocument()
      expect(errorElement).toHaveTextContent('This field is required')
      expect(errorElement).toHaveAttribute('id', 'name-error')
    })

    it('does not show error message when hasError is false', () => {
      render(<FormField {...defaultProps} errorMessage="This field is required" hasError={false} />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('sets aria-invalid when hasError is true', () => {
      render(<FormField {...defaultProps} hasError={true} />)

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    })

    it('sets aria-describedby when hasError is true', () => {
      render(<FormField {...defaultProps} errorMessage="Error" hasError={true} />)

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'name-error')
    })
  })

  describe('Interactions', () => {
    it('calls onChange when text input value changes', () => {
      render(<FormField {...defaultProps} />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'New Value' } })

      expect(defaultProps.onChange).toHaveBeenCalledWith('New Value')
    })

    it('calls onChange when textarea value changes', () => {
      render(<FormField {...defaultProps} type="textarea" />)

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'New textarea value' } })

      expect(defaultProps.onChange).toHaveBeenCalledWith('New textarea value')
    })

    it('calls onChange when select value changes', () => {
      const options = [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
      ]
      render(<FormField {...defaultProps} options={options} type="select" />)

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'medium' } })

      expect(defaultProps.onChange).toHaveBeenCalledWith('medium')
    })

    it('calls onBlur when input loses focus', () => {
      render(<FormField {...defaultProps} />)

      const input = screen.getByRole('textbox')
      fireEvent.blur(input)

      expect(defaultProps.onBlur).toHaveBeenCalled()
    })

    it('calls onBlur when textarea loses focus', () => {
      render(<FormField {...defaultProps} type="textarea" />)

      const textarea = screen.getByRole('textbox')
      fireEvent.blur(textarea)

      expect(defaultProps.onBlur).toHaveBeenCalled()
    })

    it('calls onBlur when select loses focus', () => {
      const options = [{ value: 'test', label: 'Test' }]
      render(<FormField {...defaultProps} options={options} type="select" />)

      const select = screen.getByRole('combobox')
      fireEvent.blur(select)

      expect(defaultProps.onBlur).toHaveBeenCalled()
    })
  })

  describe('Props Handling', () => {
    it('applies custom className to input', () => {
      render(<FormField {...defaultProps} className="custom-class" />)

      expect(screen.getByRole('textbox')).toHaveClass('custom-class')
    })

    it('sets input value correctly', () => {
      render(<FormField {...defaultProps} value="Test Value" />)

      expect(screen.getByRole('textbox')).toHaveValue('Test Value')
    })

    it('updates value when prop changes', () => {
      const { rerender } = render(<FormField {...defaultProps} value="Initial" />)

      expect(screen.getByRole('textbox')).toHaveValue('Initial')

      rerender(<FormField {...defaultProps} value="Updated" />)

      expect(screen.getByRole('textbox')).toHaveValue('Updated')
    })
  })
})
