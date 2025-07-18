import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Label } from './label'

// Mock Radix UI Label
vi.mock('@radix-ui/react-label', () => ({
  Root: ({ children, className, ...props }: any) => (
    <label className={className} data-testid="label-root" {...props}>
      {children}
    </label>
  ),
}))

describe('Label', () => {
  it('should render label element', () => {
    render(<Label>Test Label</Label>)

    const label = screen.getByTestId('label-root')
    expect(label).toBeInTheDocument()
    expect(label.tagName).toBe('LABEL')
    expect(label).toHaveTextContent('Test Label')
  })

  it('should have default classes', () => {
    render(<Label>Label</Label>)

    const label = screen.getByTestId('label-root')
    expect(label).toHaveClass(
      'flex',
      'items-center',
      'gap-2',
      'text-sm',
      'leading-none',
      'font-medium',
      'select-none'
    )
    expect(label).toHaveAttribute('data-slot', 'label')
  })

  it('should merge custom className', () => {
    render(<Label className="custom-class text-lg">Label</Label>)

    const label = screen.getByTestId('label-root')
    expect(label).toHaveClass('custom-class', 'text-lg')
    expect(label).toHaveClass('flex') // Should still have default classes
  })

  it('should pass through htmlFor prop', () => {
    render(<Label htmlFor="input-id">Label for input</Label>)

    const label = screen.getByTestId('label-root')
    expect(label).toHaveAttribute('for', 'input-id')
  })

  it('should render with children nodes', () => {
    render(
      <Label>
        <span>Icon</span>
        <span>Label Text</span>
      </Label>
    )

    const label = screen.getByTestId('label-root')
    expect(label).toContainHTML('<span>Icon</span>')
    expect(label).toContainHTML('<span>Label Text</span>')
  })

  it('should pass through other props', () => {
    render(
      <Label data-custom="test" id="label-id" onClick={() => {}}>
        Label
      </Label>
    )

    const label = screen.getByTestId('label-root')
    expect(label).toHaveAttribute('id', 'label-id')
    expect(label).toHaveAttribute('data-custom', 'test')
  })

  it('should handle onClick events', () => {
    const handleClick = vi.fn()
    render(<Label onClick={handleClick}>Clickable Label</Label>)

    const label = screen.getByTestId('label-root')
    label.click()

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should work with form elements', () => {
    render(
      <div>
        <Label htmlFor="test-input">Username</Label>
        <input id="test-input" type="text" />
      </div>
    )

    const label = screen.getByTestId('label-root')
    const input = screen.getByRole('textbox')

    expect(label).toHaveAttribute('for', 'test-input')
    expect(input).toHaveAttribute('id', 'test-input')
  })

  it('should handle ref forwarding', () => {
    const ref = React.createRef<HTMLLabelElement>()
    render(<Label ref={ref}>Label with ref</Label>)

    expect(ref.current).toBeInstanceOf(HTMLLabelElement)
  })

  it('should apply peer-disabled styles appropriately', () => {
    render(<Label>Label</Label>)

    const label = screen.getByTestId('label-root')
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed', 'peer-disabled:opacity-50')
  })

  it('should apply group-disabled styles appropriately', () => {
    render(<Label>Label</Label>)

    const label = screen.getByTestId('label-root')
    expect(label).toHaveClass(
      'group-data-[disabled=true]:pointer-events-none',
      'group-data-[disabled=true]:opacity-50'
    )
  })

  it('should render empty label', () => {
    render(<Label />)

    const label = screen.getByTestId('label-root')
    expect(label).toBeInTheDocument()
    expect(label).toBeEmptyDOMElement()
  })

  it('should handle complex content', () => {
    render(
      <Label>
        <svg height="16" width="16">
          <circle cx="8" cy="8" r="8" />
        </svg>
        <span>Label with icon</span>
        <span className="text-red-500">*</span>
      </Label>
    )

    const label = screen.getByTestId('label-root')
    expect(label.querySelector('svg')).toBeInTheDocument()
    expect(label).toHaveTextContent('Label with icon*')
  })

  it('should maintain accessibility', () => {
    render(
      <Label htmlFor="accessible-input">
        Accessible Label
        <span aria-hidden="true">*</span>
      </Label>
    )

    const label = screen.getByTestId('label-root')
    const hiddenSpan = label.querySelector('[aria-hidden="true"]')

    expect(label).toHaveAttribute('for', 'accessible-input')
    expect(hiddenSpan).toBeInTheDocument()
  })
})
