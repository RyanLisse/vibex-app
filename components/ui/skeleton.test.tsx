import { render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'
import { Skeleton } from './skeleton'

describe('Skeleton', () => {
  it('should render skeleton element', () => {
    render(<Skeleton data-testid="skeleton" />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton.tagName).toBe('DIV')
  })

  it('should have default classes', () => {
    render(<Skeleton data-testid="skeleton" />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('bg-accent', 'animate-pulse', 'rounded-md')
    expect(skeleton).toHaveAttribute('data-slot', 'skeleton')
  })

  it('should merge custom className', () => {
    render(<Skeleton className="h-4 w-32" data-testid="skeleton" />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('w-32', 'h-4')
    expect(skeleton).toHaveClass('bg-accent', 'animate-pulse', 'rounded-md')
  })

  it('should pass through other div props', () => {
    render(
      <Skeleton
        aria-label="Loading content"
        data-testid="skeleton"
        id="loading-skeleton"
        onClick={() => {
          // Handle click event
        }}
        role="status"
      />
    )

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveAttribute('id', 'loading-skeleton')
    expect(skeleton).toHaveAttribute('role', 'status')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading content')
  })

  it('should render with children', () => {
    render(
      <Skeleton data-testid="skeleton">
        <span className="sr-only">Loading...</span>
      </Skeleton>
    )

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toContainHTML('<span class="sr-only">Loading...</span>')
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should handle style prop', () => {
    render(<Skeleton data-testid="skeleton" style={{ width: '200px', height: '20px' }} />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveStyle({
      width: '200px',
      height: '20px',
    })
  })

  it('should work as text skeleton', () => {
    render(
      <div>
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    )

    const skeletons = screen
      .getAllByRole('generic')
      .filter((el) => el.hasAttribute('data-slot') && el.getAttribute('data-slot') === 'skeleton')
    expect(skeletons).toHaveLength(2)
    expect(skeletons[0]).toHaveClass('h-4', 'w-[250px]')
    expect(skeletons[1]).toHaveClass('h-4', 'w-[200px]')
  })

  it('should work as card skeleton', () => {
    render(
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    )

    const skeletons = screen
      .getAllByRole('generic')
      .filter((el) => el.hasAttribute('data-slot') && el.getAttribute('data-slot') === 'skeleton')
    expect(skeletons).toHaveLength(3)
    expect(skeletons[0]).toHaveClass('h-12', 'w-12', 'rounded-full')
  })

  it('should forward ref', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<Skeleton ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('should be empty by default', () => {
    render(<Skeleton data-testid="skeleton" />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toBeEmptyDOMElement()
  })

  it('should handle onClick events', () => {
    const handleClick = vi.fn()
    render(<Skeleton data-testid="skeleton" onClick={handleClick} />)

    const skeleton = screen.getByTestId('skeleton')
    skeleton.click()

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should handle custom border radius', () => {
    render(<Skeleton className="rounded-full" data-testid="skeleton" />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('rounded-full')
    expect(skeleton).toHaveClass('rounded-md') // Still has default
  })

  it('should handle custom background color', () => {
    render(<Skeleton className="bg-gray-300" data-testid="skeleton" />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('bg-gray-300')
    expect(skeleton).toHaveClass('bg-accent') // Still has default
  })

  it('should work with aspect ratio', () => {
    render(<Skeleton className="aspect-square w-24" />)

    const skeleton = screen.getByRole('generic', { hidden: true })
    expect(skeleton).toHaveClass('aspect-square', 'w-24')
  })

  it('should handle data attributes', () => {
    render(<Skeleton data-loading="true" data-testid="skeleton" data-type="text" />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveAttribute('data-loading', 'true')
    expect(skeleton).toHaveAttribute('data-type', 'text')
  })

  it('should work as inline skeleton', () => {
    render(
      <p>
        Loading <Skeleton className="inline-block h-4 w-20" /> content
      </p>
    )

    const skeleton = screen
      .getByRole('generic', { hidden: true })
      .querySelector('[data-slot="skeleton"]')
    expect(skeleton).toHaveClass('inline-block')
  })

  it('should handle title attribute', () => {
    render(<Skeleton data-testid="skeleton" title="Loading placeholder" />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveAttribute('title', 'Loading placeholder')
  })
})
