import { render, screen, waitFor } from '@testing-library/react'
import userEvent from "@testing-library/user-event";
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '@/components/ui/button'

describe('Button Integration Tests', () => {
  describe('Form Integration', () => {
    it('submits form when type is submit', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())

      render(
        <form onSubmit={handleSubmit}>
          <input defaultValue="value" name="test" />
          <Button type="submit">Submit</Button>
        </form>
      )

      const button = screen.getByRole('button', { name: 'Submit' })
      await userEvent.click(button)

      expect(handleSubmit).toHaveBeenCalledTimes(1)
    })

    it('does not submit form when type is button', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())

      render(
        <form onSubmit={handleSubmit}>
          <input defaultValue="value" name="test" />
          <Button type="button">Don&apos;t Submit</Button>
        </form>
      )

      const button = screen.getByRole('button', { name: "Don't Submit" })
      await userEvent.click(button)

      expect(handleSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('focuses button with Tab key', async () => {
      render(
        <div>
          <Button>First</Button>
          <Button>Second</Button>
        </div>
      )

      const firstButton = screen.getByRole('button', { name: 'First' })
      const secondButton = screen.getByRole('button', { name: 'Second' })

      await userEvent.tab()
      expect(firstButton).toHaveFocus()

      await userEvent.tab()
      expect(secondButton).toHaveFocus()
    })

    it('activates button with Enter key', async () => {
      const handleClick = vi.fn()

      render(<Button onClick={handleClick}>Press Enter</Button>)

      const button = screen.getByRole('button', { name: 'Press Enter' })
      button.focus()

      await userEvent.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('activates button with Space key', async () => {
      const handleClick = vi.fn()

      render(<Button onClick={handleClick}>Press Space</Button>)

      const button = screen.getByRole('button', { name: 'Press Space' })
      button.focus()

      await userEvent.keyboard(' ')
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('skips disabled button in tab order', async () => {
      render(
        <div>
          <Button>First</Button>
          <Button disabled>Disabled</Button>
          <Button>Third</Button>
        </div>
      )

      const firstButton = screen.getByRole('button', { name: 'First' })
      const thirdButton = screen.getByRole('button', { name: 'Third' })

      await userEvent.tab()
      expect(firstButton).toHaveFocus()

      await userEvent.tab()
      expect(thirdButton).toHaveFocus()
    })
  })

  describe('AsChild Integration', () => {
    it('works with Link component', async () => {
      const handleClick = vi.fn((e) => e.preventDefault())

      render(
        <Button asChild>
          <a href="/test" onClick={handleClick}>
            Link Button
          </a>
        </Button>
      )

      const link = screen.getByRole('link', { name: 'Link Button' })
      expect(link).toHaveAttribute('href', '/test')
      expect(link).toHaveClass('inline-flex') // Button styles applied

      await userEvent.click(link)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('works with custom components', async () => {
      const CustomComponent = ({ children, ...props }: React.ComponentProps<'div'>) => (
        <div data-testid="custom-component" {...props}>
          {children}
        </div>
      )

      render(
        <Button asChild>
          <CustomComponent>Custom Button</CustomComponent>
        </Button>
      )

      const customElement = screen.getByTestId('custom-component')
      expect(customElement).toHaveClass('inline-flex') // Button styles applied
      expect(customElement).toHaveAttribute('data-slot', 'button')
    })
  })

  describe('Event Handling', () => {
    it('handles multiple event types', async () => {
      const handleClick = vi.fn()
      const handleMouseEnter = vi.fn()
      const handleMouseLeave = vi.fn()
      const handleFocus = vi.fn()
      const handleBlur = vi.fn()

      render(
        <Button
          onBlur={handleBlur}
          onClick={handleClick}
          onFocus={handleFocus}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          Multi Event Button
        </Button>
      )

      const button = screen.getByRole('button', { name: 'Multi Event Button' })

      await userEvent.hover(button)
      expect(handleMouseEnter).toHaveBeenCalledTimes(1)

      await userEvent.unhover(button)
      expect(handleMouseLeave).toHaveBeenCalledTimes(1)

      button.focus()
      await waitFor(() => expect(handleFocus).toHaveBeenCalledTimes(1))

      button.blur()
      await waitFor(() => expect(handleBlur).toHaveBeenCalledTimes(1))

      await userEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('prevents event bubbling when needed', async () => {
      const parentClick = vi.fn()
      const buttonClick = vi.fn((e) => e.stopPropagation())

      render(
        <div onClick={parentClick}>
          <Button onClick={buttonClick}>Stop Propagation</Button>
        </div>
      )

      const button = screen.getByRole('button', { name: 'Stop Propagation' })
      await userEvent.click(button)

      expect(buttonClick).toHaveBeenCalledTimes(1)
      expect(parentClick).not.toHaveBeenCalled()
    })
  })

  describe('State Management', () => {
    it('handles dynamic state changes', async () => {
      const TestComponent = () => {
        const [isLoading, setIsLoading] = React.useState(false)

        return (
          <Button disabled={isLoading} onClick={() => setIsLoading(true)}>
            {isLoading ? 'Loading...' : 'Click me'}
          </Button>
        )
      }

      render(<TestComponent />)

      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).not.toBeDisabled()

      await userEvent.click(button)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled()
      })
    })

    it('handles conditional rendering', async () => {
      const TestComponent = () => {
        const [showButton, setShowButton] = React.useState(true)

        return (
          <div>
            <Button onClick={() => setShowButton(false)}>
              {showButton ? 'Hide me' : 'Show me'}
            </Button>
            {!showButton && <div>Button was hidden</div>}
          </div>
        )
      }

      render(<TestComponent />)

      const button = screen.getByRole('button', { name: 'Hide me' })
      await userEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Button was hidden')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility Integration', () => {
    it('works with screen readers', async () => {
      render(
        <Button
          aria-describedby="help-text"
          aria-expanded={false}
          aria-haspopup="dialog"
          aria-label="Close dialog"
        >
          ×
        </Button>
      )

      const button = screen.getByRole('button', { name: 'Close dialog' })
      expect(button).toHaveAttribute('aria-describedby', 'help-text')
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    })

    it('announces state changes to screen readers', async () => {
      const TestComponent = () => {
        const [pressed, setPressed] = React.useState(false)

        return (
          <Button aria-pressed={pressed} onClick={() => setPressed(!pressed)}>
            {pressed ? 'Pressed' : 'Not pressed'}
          </Button>
        )
      }

      render(<TestComponent />)

      const button = screen.getByRole('button', { name: 'Not pressed' })
      expect(button).toHaveAttribute('aria-pressed', 'false')

      await userEvent.click(button)

      await waitFor(() => {
        const updatedButton = screen.getByRole('button', { name: 'Pressed' })
        expect(updatedButton).toHaveAttribute('aria-pressed', 'true')
      })
    })
  })
})
