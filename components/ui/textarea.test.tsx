import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'
import { Textarea } from '@/components/ui/textarea'

describe('Textarea', () => {
  it('should render textarea element', () => {
    render(<Textarea placeholder="Enter text" />)

    const textarea = screen.getByPlaceholderText('Enter text')
    expect(textarea).toBeInTheDocument()
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('should have default classes', () => {
    render(<Textarea data-testid="textarea" />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveClass(
      'flex',
      'field-sizing-content',
      'min-h-16',
      'w-full',
      'rounded-md',
      'border',
      'bg-transparent',
      'px-3',
      'py-2',
      'text-base',
      'shadow-xs'
    )
    expect(textarea).toHaveAttribute('data-slot', 'textarea')
  })

  it('should merge custom className', () => {
    render(<Textarea className="custom-class h-32" data-testid="textarea" />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveClass('custom-class', 'h-32')
    expect(textarea).toHaveClass('flex') // Should still have default classes
  })

  it('should pass through value prop', () => {
    render(<Textarea data-testid="textarea" onChange={() => {}} value="Initial text" />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveValue('Initial text')
  })

  it('should pass through defaultValue prop', () => {
    render(<Textarea data-testid="textarea" defaultValue="Default text" />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveValue('Default text')
  })

  it('should pass through placeholder prop', () => {
    render(<Textarea placeholder="Enter your message..." />)

    const textarea = screen.getByPlaceholderText('Enter your message...')
    expect(textarea).toBeInTheDocument()
  })

  it('should handle disabled state', () => {
    render(<Textarea data-testid="textarea" disabled />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toBeDisabled()
    expect(textarea).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('should handle readOnly state', () => {
    render(<Textarea data-testid="textarea" readOnly value="Read only text" />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('readOnly')
    expect(textarea).toHaveValue('Read only text')
  })

  it('should handle required attribute', () => {
    render(<Textarea data-testid="textarea" required />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toBeRequired()
  })

  it('should handle rows and cols attributes', () => {
    render(<Textarea cols={50} data-testid="textarea" rows={10} />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('rows', '10')
    expect(textarea).toHaveAttribute('cols', '50')
  })

  it('should handle maxLength and minLength', () => {
    render(<Textarea data-testid="textarea" maxLength={100} minLength={10} />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('maxLength', '100')
    expect(textarea).toHaveAttribute('minLength', '10')
  })

  it('should handle onChange events', () => {
    const handleChange = vi.fn()
    render(<Textarea data-testid="textarea" onChange={handleChange} />)

    const textarea = screen.getByTestId('textarea')
    fireEvent.change(textarea, { target: { value: 'New text content' } })

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: 'New text content',
        }),
      })
    )
  })

  it('should handle onFocus events', () => {
    const handleFocus = vi.fn()
    render(<Textarea data-testid="textarea" onFocus={handleFocus} />)

    const textarea = screen.getByTestId('textarea')
    fireEvent.focus(textarea)

    expect(handleFocus).toHaveBeenCalledTimes(1)
  })

  it('should handle onBlur events', () => {
    const handleBlur = vi.fn()
    render(<Textarea data-testid="textarea" onBlur={handleBlur} />)

    const textarea = screen.getByTestId('textarea')
    fireEvent.blur(textarea)

    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('should handle onKeyDown events', () => {
    const handleKeyDown = vi.fn()
    render(<Textarea data-testid="textarea" onKeyDown={handleKeyDown} />)

    const textarea = screen.getByTestId('textarea')
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

    expect(handleKeyDown).toHaveBeenCalledTimes(1)
    expect(handleKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'Enter',
        shiftKey: true,
      })
    )
  })

  it('should forward ref', () => {
    const ref = React.createRef<HTMLTextAreaElement>()
    render(<Textarea ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })

  it('should handle aria-invalid attribute', () => {
    render(<Textarea aria-invalid="true" data-testid="textarea" />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
  })

  it('should handle aria-describedby attribute', () => {
    render(<Textarea aria-describedby="error-message" data-testid="textarea" />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('aria-describedby', 'error-message')
  })

  it('should handle aria-label attribute', () => {
    render(<Textarea aria-label="Message input" data-testid="textarea" />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('aria-label', 'Message input')
  })

  it('should handle name attribute', () => {
    render(<Textarea data-testid="textarea" name="message" />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('name', 'message')
  })

  it('should handle id attribute', () => {
    render(<Textarea data-testid="textarea" id="message-textarea" />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('id', 'message-textarea')
  })

  it('should handle autoComplete attribute', () => {
    render(<Textarea autoComplete="off" data-testid="textarea" />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('autoComplete', 'off')
  })

  it('should handle autoFocus attribute', () => {
    render(<Textarea autoFocus data-testid="textarea" />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('autoFocus')
  })

  it('should handle controlled component', () => {
    const Component = () => {
      const [value, setValue] = React.useState('Initial text')
      return (
        <Textarea data-testid="textarea" onChange={(e) => setValue(e.target.value)} value={value} />
      )
    }

    render(<Component />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveValue('Initial text')

    fireEvent.change(textarea, { target: { value: 'Updated text content' } })
    expect(textarea).toHaveValue('Updated text content')
  })

  it('should handle uncontrolled component', () => {
    render(<Textarea data-testid="textarea" defaultValue="Default content" />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveValue('Default content')

    fireEvent.change(textarea, { target: { value: 'New content' } })
    expect(textarea).toHaveValue('New content')
  })

  it('should handle multiline text', () => {
    const multilineText = 'Line 1\nLine 2\nLine 3'
    render(<Textarea data-testid="textarea" defaultValue={multilineText} />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveValue(multilineText)
  })

  it('should handle wrap attribute', () => {
    render(<Textarea data-testid="textarea" wrap="hard" />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('wrap', 'hard')
  })

  it('should handle spellCheck attribute', () => {
    render(<Textarea data-testid="textarea" spellCheck={false} />)

    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('spellCheck', 'false')
  })
})
