import { render, screen } from '@testing-library/react'
import React from 'react'
import { Badge, badgeVariants } from '@/components/ui/badge'

describe('Badge', () => {
  it('should render badge with default variant', () => {
    render(<Badge>Default Badge</Badge>)

    const badge = screen.getByText('Default Badge')
    expect(badge).toBeInTheDocument()
    expect(badge.tagName).toBe('DIV')
    expect(badge).toHaveClass(
      'inline-flex',
      'items-center',
      'rounded-full',
      'border',
      'px-2.5',
      'py-0.5',
      'text-xs',
      'font-semibold',
      'transition-colors',
      'border-transparent',
      'bg-primary',
      'text-primary-foreground',
      'hover:bg-primary/80'
    )
  })

  it('should render with secondary variant', () => {
    render(<Badge variant="secondary">Secondary Badge</Badge>)

    const badge = screen.getByText('Secondary Badge')
    expect(badge).toHaveClass(
      'border-transparent',
      'bg-secondary',
      'text-secondary-foreground',
      'hover:bg-secondary/80'
    )
  })

  it('should render with destructive variant', () => {
    render(<Badge variant="destructive">Destructive Badge</Badge>)

    const badge = screen.getByText('Destructive Badge')
    expect(badge).toHaveClass(
      'border-transparent',
      'bg-destructive',
      'text-destructive-foreground',
      'hover:bg-destructive/80'
    )
  })

  it('should render with outline variant', () => {
    render(<Badge variant="outline">Outline Badge</Badge>)

    const badge = screen.getByText('Outline Badge')
    expect(badge).toHaveClass('text-foreground')
    expect(badge).not.toHaveClass('border-transparent')
  })

  it('should merge custom className', () => {
    render(<Badge className="custom-class ml-2">Custom Badge</Badge>)

    const badge = screen.getByText('Custom Badge')
    expect(badge).toHaveClass('custom-class', 'ml-2')
    expect(badge).toHaveClass('inline-flex') // Should still have base classes
  })

  it('should pass through other HTML div props', () => {
    render(
      <Badge
        aria-label="Status badge"
        aria-live="polite"
        data-testid="badge"
        id="test-badge"
        onClick={() => {
          // Handle click event
        }}
      >
        Badge
      </Badge>
    )

    const badge = screen.getByTestId('badge')
    expect(badge).toHaveAttribute('id', 'test-badge')
    expect(badge).toHaveAttribute('role', 'status')
    expect(badge).toHaveAttribute('aria-label', 'Status badge')
  })

  it('should handle onClick events', () => {
    const handleClick = mock()
    render(<Badge onClick={handleClick}>Clickable Badge</Badge>)

    const badge = screen.getByText('Clickable Badge')
    badge.click()

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should render with complex children', () => {
    render(
      <Badge>
        <svg aria-hidden="true" className="mr-1" height="12" width="12">
          <title>Status icon</title>
          <circle cx="6" cy="6" r="6" />
        </svg>
        <span>Badge with icon</span>
      </Badge>
    )

    const badge = screen.getByText('Badge with icon').parentElement
    expect(badge?.querySelector('svg')).toBeInTheDocument()
  })

  it('should handle empty badge', () => {
    render(<Badge data-testid="empty-badge" />)

    const badge = screen.getByTestId('empty-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toBeEmptyDOMElement()
  })

  it('should have focus styles', () => {
    render(<Badge>Focusable Badge</Badge>)

    const badge = screen.getByText('Focusable Badge')
    expect(badge).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-ring',
      'focus:ring-offset-2'
    )
  })

  it('should forward ref', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<Badge ref={ref}>Badge with ref</Badge>)

    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('should render with numeric content', () => {
    render(<Badge>42</Badge>)

    const badge = screen.getByText('42')
    expect(badge).toBeInTheDocument()
  })

  it('should render as inline element', () => {
    render(
      <div>
        Text before <Badge>Inline Badge</Badge> text after
      </div>
    )

    const badge = screen.getByText('Inline Badge')
    expect(badge).toHaveClass('inline-flex')
  })

  it('should support title attribute', () => {
    render(<Badge title="This is a tooltip">Hover Badge</Badge>)

    const badge = screen.getByText('Hover Badge')
    expect(badge).toHaveAttribute('title', 'This is a tooltip')
  })

  it('should handle style prop', () => {
    render(<Badge style={{ backgroundColor: 'red', color: 'white' }}>Styled Badge</Badge>)

    const badge = screen.getByText('Styled Badge')
    expect(badge).toHaveStyle({
      backgroundColor: 'red',
      color: 'white',
    })
  })
})

describe('badgeVariants', () => {
  it('should generate correct classes for default variant', () => {
    const classes = badgeVariants({ variant: 'default' })
    expect(classes).toContain('bg-primary')
    expect(classes).toContain('text-primary-foreground')
  })

  it('should generate correct classes for secondary variant', () => {
    const classes = badgeVariants({ variant: 'secondary' })
    expect(classes).toContain('bg-secondary')
    expect(classes).toContain('text-secondary-foreground')
  })

  it('should generate correct classes for destructive variant', () => {
    const classes = badgeVariants({ variant: 'destructive' })
    expect(classes).toContain('bg-destructive')
    expect(classes).toContain('text-destructive-foreground')
  })

  it('should generate correct classes for outline variant', () => {
    const classes = badgeVariants({ variant: 'outline' })
    expect(classes).toContain('text-foreground')
  })

  it('should use default variant when not specified', () => {
    const classes = badgeVariants({})
    expect(classes).toContain('bg-primary')
  })
})
