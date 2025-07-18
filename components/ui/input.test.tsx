import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('should render input element', () => {
    render(<Input placeholder="Enter text" />)

    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })

  it('should have default classes', () => {
    render(<Input data-testid="input" />)

    const input = screen.getByTestId('input')
    expect(input).toHaveClass('flex', 'h-9', 'w-full', 'rounded-md', 'border')
    expect(input).toHaveAttribute('data-slot', 'input')
  })

  it('should merge custom className', () => {
    render(<Input className="custom-class w-64" data-testid="input" />)

    const input = screen.getByTestId('input')
    expect(input).toHaveClass('custom-class', 'w-64')
    expect(input).toHaveClass('flex') // Should still have default classes
  })

  it('should pass through type prop', () => {
    render(<Input data-testid="input" type="email" />)

    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'email')
  })

  it('should handle text input type', () => {
    render(<Input data-testid="input" type="text" />)

    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'text')
  })

  it('should handle password input type', () => {
    render(<Input data-testid="input" type="password" />)

    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('should handle number input type', () => {
    render(<Input data-testid="input" type="number" />)

    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'number')
  })

  it('should pass through other HTML input props', () => {
    render(
      <Input
        autoComplete="off"
        autoFocus
        data-testid="input"
        disabled
        id="test-input"
        maxLength={50}
        minLength={5}
        name="testName"
        onChange={() => {}}
        pattern="[A-Za-z]+"
        placeholder="Enter text"
        readOnly
        required
        value="test value"
      />
    )

    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('id', 'test-input')
    expect(input).toHaveAttribute('name', 'testName')
    expect(input).toHaveAttribute('value', 'test value')
    expect(input).toHaveAttribute('placeholder', 'Enter text')
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute('readOnly')
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('maxLength', '50')
    expect(input).toHaveAttribute('minLength', '5')
    expect(input).toHaveAttribute('pattern', '[A-Za-z]+')
    expect(input).toHaveAttribute('autoComplete', 'off')
    expect(input).toHaveAttribute('autoFocus')
  })

  it('should handle onChange events', () => {
    const handleChange = mock()
    render(<Input data-testid="input" onChange={handleChange} />)

    const input = screen.getByTestId('input')
    fireEvent.change(input, { target: { value: 'new value' } })

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: 'new value',
        }),
      })
    )
  })

  it('should handle onFocus events', () => {
    const handleFocus = mock()
    render(<Input data-testid="input" onFocus={handleFocus} />)

    const input = screen.getByTestId('input')
    fireEvent.focus(input)

    expect(handleFocus).toHaveBeenCalledTimes(1)
  })

  it('should handle onBlur events', () => {
    const handleBlur = mock()
    render(<Input data-testid="input" onBlur={handleBlur} />)

    const input = screen.getByTestId('input')
    fireEvent.blur(input)

    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('should handle onKeyDown events', () => {
    const handleKeyDown = mock()
    render(<Input data-testid="input" onKeyDown={handleKeyDown} />)

    const input = screen.getByTestId('input')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(handleKeyDown).toHaveBeenCalledTimes(1)
    expect(handleKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'Enter',
      })
    )
  })

  it('should forward ref', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('should handle file input type', () => {
    render(<Input accept="image/*" data-testid="input" type="file" />)

    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('accept', 'image/*')
  })

  it('should handle search input type', () => {
    render(<Input data-testid="input" type="search" />)

    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'search')
  })

  it('should handle date input type', () => {
    render(<Input data-testid="input" type="date" />)

    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'date')
  })

  it('should handle aria-invalid attribute', () => {
    render(<Input aria-invalid="true" data-testid="input" />)

    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('should handle aria-describedby attribute', () => {
    render(<Input aria-describedby="error-message" data-testid="input" />)

    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('aria-describedby', 'error-message')
  })

  it('should handle controlled component', () => {
    const Component = () => {
      const [value, setValue] = React.useState('initial')
      return <Input data-testid="input" onChange={(e) => setValue(e.target.value)} value={value} />
    }

    render(<Component />)

    const input = screen.getByTestId('input')
    expect(input).toHaveValue('initial')

    fireEvent.change(input, { target: { value: 'updated' } })
    expect(input).toHaveValue('updated')
  })

  it('should handle uncontrolled component with defaultValue', () => {
    render(<Input data-testid="input" defaultValue="default text" />)

    const input = screen.getByTestId('input')
    expect(input).toHaveValue('default text')

    fireEvent.change(input, { target: { value: 'new text' } })
    expect(input).toHaveValue('new text')
  })
})
