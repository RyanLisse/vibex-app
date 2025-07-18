import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import React from 'react'
import { Separator } from '@/components/ui/separator'

// Mock Radix UI Separator
vi.mock('@radix-ui/react-separator', () => ({
  Root: ({ className, orientation, decorative, ...props }: any) => (
    <div
      aria-orientation={orientation}
      className={className}
      data-decorative={decorative}
      data-orientation={orientation}
      data-testid="separator-root"
      role={decorative ? 'none' : 'separator'}
      {...props}
    />
  ),
}))

describe('Separator', () => {
  it('should render horizontal separator by default', () => {
    render(<Separator />)

    const separator = screen.getByTestId('separator-root')
    expect(separator).toBeInTheDocument()
    expect(separator).toHaveAttribute('data-slot', 'separator')
    expect(separator).toHaveAttribute('data-orientation', 'horizontal')
    expect(separator).toHaveAttribute('data-decorative', 'true')
    expect(separator).toHaveClass('bg-border', 'shrink-0')
  })

  it('should render with horizontal orientation classes', () => {
    render(<Separator orientation="horizontal" />)

    const separator = screen.getByTestId('separator-root')
    expect(separator).toHaveAttribute('data-orientation', 'horizontal')
    expect(separator).toHaveClass(
      'data-[orientation=horizontal]:h-px',
      'data-[orientation=horizontal]:w-full'
    )
  })

  it('should render with vertical orientation', () => {
    render(<Separator orientation="vertical" />)

    const separator = screen.getByTestId('separator-root')
    expect(separator).toHaveAttribute('data-orientation', 'vertical')
    expect(separator).toHaveClass(
      'data-[orientation=vertical]:h-full',
      'data-[orientation=vertical]:w-px'
    )
  })

  it('should be decorative by default', () => {
    render(<Separator />)

    const separator = screen.getByTestId('separator-root')
    expect(separator).toHaveAttribute('data-decorative', 'true')
    expect(separator).toHaveAttribute('role', 'none')
  })

  it('should be non-decorative when specified', () => {
    render(<Separator decorative={false} />)

    const separator = screen.getByTestId('separator-root')
    expect(separator).toHaveAttribute('data-decorative', 'false')
    expect(separator).toHaveAttribute('role', 'separator')
  })

  it('should merge custom className', () => {
    render(<Separator className="custom-separator my-4" />)

    const separator = screen.getByTestId('separator-root')
    expect(separator).toHaveClass('custom-separator', 'my-4')
    expect(separator).toHaveClass('bg-border', 'shrink-0')
  })

  it('should pass through other props', () => {
    render(<Separator aria-label="Section separator" data-custom="value" id="test-separator" />)

    const separator = screen.getByTestId('separator-root')
    expect(separator).toHaveAttribute('id', 'test-separator')
    expect(separator).toHaveAttribute('data-custom', 'value')
    expect(separator).toHaveAttribute('aria-label', 'Section separator')
  })

  it('should forward ref', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<Separator ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('should handle style prop', () => {
    render(<Separator style={{ backgroundColor: 'red', margin: '10px' }} />)

    const separator = screen.getByTestId('separator-root')
    expect(separator).toHaveStyle({
      backgroundColor: 'red',
      margin: '10px',
    })
  })

  it('should work in horizontal layout', () => {
    render(
      <div>
        <div>Content above</div>
        <Separator />
        <div>Content below</div>
      </div>
    )

    const separator = screen.getByTestId('separator-root')
    expect(separator).toHaveAttribute('data-orientation', 'horizontal')
  })

  it('should work in vertical layout', () => {
    render(
      <div style={{ display: 'flex' }}>
        <div>Left content</div>
        <Separator orientation="vertical" />
        <div>Right content</div>
      </div>
    )

    const separator = screen.getByTestId('separator-root')
    expect(separator).toHaveAttribute('data-orientation', 'vertical')
  })

  it('should have correct aria attributes for non-decorative separator', () => {
    render(<Separator decorative={false} />)

    const separator = screen.getByTestId('separator-root')
    expect(separator).toHaveAttribute('aria-orientation', 'horizontal')
  })

  it('should have correct aria attributes for vertical non-decorative separator', () => {
    render(<Separator decorative={false} orientation="vertical" />)

    const separator = screen.getByTestId('separator-root')
    expect(separator).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('should handle custom background color class', () => {
    render(<Separator className="bg-red-500" />)

    const separator = screen.getByTestId('separator-root')
    expect(separator).toHaveClass('bg-red-500')
    // Should still have the default bg-border class
    expect(separator).toHaveClass('bg-border')
  })

  it('should handle custom size classes', () => {
    render(<Separator className="h-2" orientation="horizontal" />)

    const separator = screen.getByTestId('separator-root')
    expect(separator).toHaveClass('h-2')
  })

  it('should handle custom width for vertical separator', () => {
    render(<Separator className="w-2" orientation="vertical" />)

    const separator = screen.getByTestId('separator-root')
    expect(separator).toHaveClass('w-2')
  })
})
