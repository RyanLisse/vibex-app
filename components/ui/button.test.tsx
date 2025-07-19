import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import React from 'react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>)
      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('inline-flex')
      expect(button).toHaveClass('bg-primary')
      expect(button).toHaveClass('h-9')
    })

    it('renders with custom className', () => {
      render(<Button className="custom-class">Test</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('renders as child element when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/test')
    })

    it('has correct data-slot attribute', () => {
      render(<Button>Test</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-slot', 'button')
    })
  })

  describe('Variants', () => {
    it('applies default variant classes', () => {
      render(<Button>Default</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary')
      expect(button).toHaveClass('text-primary-foreground')
    })

    it('applies destructive variant classes', () => {
      render(<Button variant="destructive">Destructive</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive')
      expect(button).toHaveClass('text-white')
    })

    it('applies outline variant classes', () => {
      render(<Button variant="outline">Outline</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border')
      expect(button).toHaveClass('bg-background')
    })

    it('applies secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-secondary')
      expect(button).toHaveClass('text-secondary-foreground')
    })

    it('applies ghost variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent')
      expect(button).toHaveClass('hover:text-accent-foreground')
    })

    it('applies link variant classes', () => {
      render(<Button variant="link">Link</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-primary')
      expect(button).toHaveClass('underline-offset-4')
    })
  })

  describe('Sizes', () => {
    it('applies default size classes', () => {
      render(<Button>Default Size</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9')
      expect(button).toHaveClass('px-4')
    })

    it('applies small size classes', () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-8')
      expect(button).toHaveClass('px-3')
    })

    it('applies large size classes', () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10')
      expect(button).toHaveClass('px-6')
    })

    it('applies icon size classes', () => {
      render(<Button size="icon">🚀</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('size-9')
    })
  })

  describe('Interactions', () => {
    it('calls onClick handler when clicked', () => {
      const handleClick = mock()
      render(<Button onClick={handleClick}>Click me</Button>)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', () => {
      const handleClick = mock()
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('applies disabled styles', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('disabled:pointer-events-none')
      expect(button).toHaveClass('disabled:opacity-50')
      expect(button).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('supports aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>)
      const button = screen.getByRole('button', { name: 'Close dialog' })
      expect(button).toBeInTheDocument()
    })

    it('supports aria-describedby', () => {
      render(
        <div>
          <Button aria-describedby="description">Action</Button>
          <div id="description">This button performs an action</div>
        </div>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-describedby', 'description')
    })

    it('supports aria-invalid styling', () => {
      render(<Button aria-invalid="true">Invalid</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('aria-invalid:ring-destructive/20')
    })

    it('supports focus-visible styling', () => {
      render(<Button>Focus me</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus-visible:border-ring')
      expect(button).toHaveClass('focus-visible:ring-ring/50')
    })
  })

  describe('Icon Support', () => {
    it('applies icon-specific classes', () => {
      render(
        <Button>
          Text with <svg>icon</svg>
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveClass('[&_svg]:pointer-events-none')
      expect(button).toHaveClass('[&_svg]:shrink-0')
    })

    it('applies size-specific icon padding', () => {
      render(
        <Button size="sm">
          Text with <svg>icon</svg>
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveClass('has-[>svg]:px-2.5')
    })
  })

  describe('Forwarded Props', () => {
    it('forwards HTML button props', () => {
      render(
        <Button name="submit-btn" type="submit" value="submit">
          Submit
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
      expect(button).toHaveAttribute('name', 'submit-btn')
      expect(button).toHaveAttribute('value', 'submit')
    })

    it('forwards data attributes', () => {
      render(
        <Button data-custom="value" data-testid="custom-button">
          Test
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-testid', 'custom-button')
      expect(button).toHaveAttribute('data-custom', 'value')
    })
  })
})
