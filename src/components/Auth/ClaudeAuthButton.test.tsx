import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ClaudeAuthButton } from './ClaudeAuthButton'

// Mock the useClaudeAuth hook
vi.mock('@/hooks/useClaudeAuth', () => ({
  default: vi.fn(() => ({
    startLogin: vi.fn(),
    isAuthenticating: false,
    error: null,
  })),
}))

// Mock the Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant, ...props }: any) => (
    <button
      className={className}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  ),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: ({ className }: any) => (
    <span className={className} data-testid="loader-icon">
      Loading...
    </span>
  ),
}))

describe('ClaudeAuthButton', () => {
  const mockProps = {
    clientId: 'test-client-id',
    redirectUri: 'https://example.com/callback',
    onSuccess: vi.fn(),
    onError: vi.fn(),
  }

  beforeEach(() => {
    mock.restore()
  })

  describe('rendering', () => {
    it('should render with default text', () => {
      render(<ClaudeAuthButton {...mockProps} />)

      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('Sign in with Claude')).toBeInTheDocument()
    })

    it('should render with custom children', () => {
      render(
        <ClaudeAuthButton {...mockProps}>
          <span>Custom Auth Text</span>
        </ClaudeAuthButton>
      )

      expect(screen.getByText('Custom Auth Text')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<ClaudeAuthButton {...mockProps} className="custom-class" />)

      expect(screen.getByRole('button')).toHaveClass('custom-class')
    })

    it('should render with outline variant', () => {
      render(<ClaudeAuthButton {...mockProps} />)

      expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'outline')
    })
  })

  describe('authentication states', () => {
    it('should show loading state when authenticating', async () => {
      const useClaudeAuth = await import('@/hooks/useClaudeAuth')
      mocked(useClaudeAuth.default).mockReturnValue({
        startLogin: vi.fn(),
        isAuthenticating: true,
        error: null,
      })

      render(<ClaudeAuthButton {...mockProps} />)

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
      expect(screen.getByText('Authenticating...')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should not show loading state when not authenticating', () => {
      render(<ClaudeAuthButton {...mockProps} />)

      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument()
      expect(screen.queryByText('Authenticating...')).not.toBeInTheDocument()
      expect(screen.getByRole('button')).not.toBeDisabled()
    })
  })

  describe('user interactions', () => {
    it('should call startLogin when button is clicked', async () => {
      const mockStartLogin = vi.fn()
      const useClaudeAuth = await import('@/hooks/useClaudeAuth')
      mocked(useClaudeAuth.default).mockReturnValue({
        startLogin: mockStartLogin,
        isAuthenticating: false,
        error: null,
      })

      const user = userEvent.setup()
      render(<ClaudeAuthButton {...mockProps} />)

      await user.click(screen.getByRole('button'))

      expect(mockStartLogin).toHaveBeenCalledTimes(1)
    })

    it('should not call startLogin when button is disabled', async () => {
      const mockStartLogin = vi.fn()
      const useClaudeAuth = await import('@/hooks/useClaudeAuth')
      mocked(useClaudeAuth.default).mockReturnValue({
        startLogin: mockStartLogin,
        isAuthenticating: true,
        error: null,
      })

      const user = userEvent.setup()
      render(<ClaudeAuthButton {...mockProps} />)

      await user.click(screen.getByRole('button'))

      expect(mockStartLogin).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should call onError when error occurs', async () => {
      const mockError = new Error('Authentication failed')
      const useClaudeAuth = await import('@/hooks/useClaudeAuth')
      mocked(useClaudeAuth.default).mockReturnValue({
        startLogin: vi.fn(),
        isAuthenticating: false,
        error: mockError,
      })

      render(<ClaudeAuthButton {...mockProps} />)

      await waitFor(() => {
        expect(mockProps.onError).toHaveBeenCalledWith(mockError)
      })
    })

    it('should not call onError when no error', () => {
      render(<ClaudeAuthButton {...mockProps} />)

      expect(mockProps.onError).not.toHaveBeenCalled()
    })

    it('should handle missing onError callback gracefully', async () => {
      const mockError = new Error('Authentication failed')
      const useClaudeAuth = await import('@/hooks/useClaudeAuth')
      mocked(useClaudeAuth.default).mockReturnValue({
        startLogin: vi.fn(),
        isAuthenticating: false,
        error: mockError,
      })

      const propsWithoutOnError = {
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
      }

      expect(() => {
        render(<ClaudeAuthButton {...propsWithoutOnError} />)
      }).not.toThrow()
    })
  })

  describe('hook integration', () => {
    it('should pass correct props to useClaudeAuth', async () => {
      const useClaudeAuth = await import('@/hooks/useClaudeAuth')
      const mockHook = mocked(useClaudeAuth.default)

      render(<ClaudeAuthButton {...mockProps} />)

      expect(mockHook).toHaveBeenCalledWith({
        clientId: mockProps.clientId,
        redirectUri: mockProps.redirectUri,
        onSuccess: mockProps.onSuccess,
        onError: mockProps.onError,
      })
    })

    it('should handle hook updates correctly', async () => {
      const useClaudeAuth = await import('@/hooks/useClaudeAuth')
      const mockHook = mocked(useClaudeAuth.default)

      // Initial render
      mockHook.mockReturnValue({
        startLogin: vi.fn(),
        isAuthenticating: false,
        error: null,
      })

      const { rerender } = render(<ClaudeAuthButton {...mockProps} />)

      expect(screen.getByText('Sign in with Claude')).toBeInTheDocument()

      // Update to authenticating state
      mockHook.mockReturnValue({
        startLogin: vi.fn(),
        isAuthenticating: true,
        error: null,
      })

      rerender(<ClaudeAuthButton {...mockProps} />)

      expect(screen.getByText('Authenticating...')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle rapid clicks', async () => {
      const mockStartLogin = vi.fn()
      const useClaudeAuth = await import('@/hooks/useClaudeAuth')
      mocked(useClaudeAuth.default).mockReturnValue({
        startLogin: mockStartLogin,
        isAuthenticating: false,
        error: null,
      })

      const user = userEvent.setup()
      render(<ClaudeAuthButton {...mockProps} />)

      const button = screen.getByRole('button')

      // Simulate rapid clicks
      await user.click(button)
      await user.click(button)
      await user.click(button)

      // Should still only call once per click
      expect(mockStartLogin).toHaveBeenCalledTimes(3)
    })

    it('should handle undefined callbacks', () => {
      const minimalProps = {
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
      }

      expect(() => {
        render(<ClaudeAuthButton {...minimalProps} />)
      }).not.toThrow()
    })

    it('should handle empty className', () => {
      render(<ClaudeAuthButton {...mockProps} className="" />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })
})
