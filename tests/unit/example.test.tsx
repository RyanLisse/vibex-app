import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('renders button with text', () => {
    const { getByRole } = render(<Button>Click me</Button>)
    expect(getByRole('button')).toHaveTextContent('Click me')
  })

  it('applies variant styles correctly', () => {
    const { getByRole } = render(<Button variant="destructive">Delete</Button>)
    const button = getByRole('button')
    expect(button).toHaveClass('bg-destructive')
  })

  it('handles click events', async () => {
    const handleClick = vi.fn()
    const { getByRole } = render(<Button onClick={handleClick}>Click me</Button>)

    const button = getByRole('button')
    await button.click()

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
