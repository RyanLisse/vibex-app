import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { OpenAIAuthButton } from './openai-auth-button'

// Mock the openai auth hook
const mockUseOpenAIAuth = vi.fn()
vi.mock('@/hooks/use-openai-auth', () => ({
  useOpenAIAuth: () => mockUseOpenAIAuth(),
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  LogIn: ({ className, ...props }: any) => (
    <svg data-testid="login-icon" className={className} {...props} />
  ),
  LogOut: ({ className, ...props }: any) => (
    <svg data-testid="logout-icon" className={className} {...props} />
  ),
  User: ({ className, ...props }: any) => (
    <svg data-testid="user-icon" className={className} {...props} />
  ),
  Loader2: ({ className, ...props }: any) => (
    <svg data-testid="loader-icon" className={className} {...props} />
  ),
}))

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, disabled, ...props }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}))

describe('OpenAIAuthButton', () => {
  const mockLogin = vi.fn()
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: true,
      login: mockLogin,
      logout: mockLogout,
      user: null,
    })

    render(<OpenAIAuthButton />)

    const button = screen.getByTestId('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Loading...')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('data-variant', 'default')
    expect(button).toHaveAttribute('data-size', 'default')
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    expect(screen.getByTestId('loader-icon')).toHaveClass('animate-spin')
  })

  it('should render login button when not authenticated', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
    })

    render(<OpenAIAuthButton />)

    const button = screen.getByTestId('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Sign in with ChatGPT')
    expect(button).not.toBeDisabled()
    expect(screen.getByTestId('login-icon')).toBeInTheDocument()
  })

  it('should handle login button click', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
    })

    render(<OpenAIAuthButton />)

    const button = screen.getByTestId('button')
    fireEvent.click(button)

    expect(mockLogin).toHaveBeenCalledTimes(1)
    expect(mockLogin).toHaveBeenCalledWith()
  })

  it('should render authenticated state with user email', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
    })

    render(<OpenAIAuthButton />)

    expect(screen.getByTestId('user-icon')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
    expect(screen.getByTestId('logout-icon')).toBeInTheDocument()
  })

  it('should render authenticated state without user email', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
    })

    render(<OpenAIAuthButton />)

    expect(screen.getByTestId('user-icon')).toBeInTheDocument()
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('should render authenticated state with empty user object', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: {},
    })

    render(<OpenAIAuthButton />)

    expect(screen.getByText('OpenAI')).toBeInTheDocument()
  })

  it('should handle logout button click', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
    })

    render(<OpenAIAuthButton />)

    const logoutButton = screen.getByText('Logout').closest('button')
    fireEvent.click(logoutButton!)

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('should apply custom variant and size', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
    })

    render(<OpenAIAuthButton variant="outline" size="lg" />)

    const button = screen.getByTestId('button')
    expect(button).toHaveAttribute('data-variant', 'outline')
    expect(button).toHaveAttribute('data-size', 'lg')
  })

  it('should apply custom variant and size to loading state', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: true,
      login: mockLogin,
      logout: mockLogout,
      user: null,
    })

    render(<OpenAIAuthButton variant="ghost" size="sm" />)

    const button = screen.getByTestId('button')
    expect(button).toHaveAttribute('data-variant', 'ghost')
    expect(button).toHaveAttribute('data-size', 'sm')
  })

  it('should apply custom size to logout button', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
    })

    render(<OpenAIAuthButton size="sm" />)

    const logoutButton = screen.getByText('Logout').closest('button')
    expect(logoutButton).toHaveAttribute('data-variant', 'outline')
    expect(logoutButton).toHaveAttribute('data-size', 'sm')
  })

  it('should render user info with proper styling', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
    })

    render(<OpenAIAuthButton />)

    const userInfo = screen.getByText('test@example.com').closest('div')
    expect(userInfo).toHaveClass('flex', 'items-center', 'gap-1', 'text-sm', 'text-green-600')
  })

  it('should handle authentication state transitions', () => {
    // Start unauthenticated
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
    })

    const { rerender } = render(<OpenAIAuthButton />)
    expect(screen.getByText('Sign in with ChatGPT')).toBeInTheDocument()

    // Transition to authenticated
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
    })

    rerender(<OpenAIAuthButton />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('should handle user with additional properties', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: {
        email: 'test@example.com',
        organization_id: 'org-123',
        credits_granted: 100,
        created_at: Date.now(),
      },
    })

    render(<OpenAIAuthButton />)

    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('should have proper container structure when authenticated', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
    })

    render(<OpenAIAuthButton />)

    const container = screen.getByText('test@example.com').closest('div')?.parentElement
    expect(container).toHaveClass('flex', 'items-center', 'gap-2')
  })

  it('should handle multiple rapid clicks', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
    })

    render(<OpenAIAuthButton />)

    const button = screen.getByTestId('button')
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)

    expect(mockLogin).toHaveBeenCalledTimes(3)
  })

  it('should handle default props correctly', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
    })

    render(<OpenAIAuthButton />)

    const button = screen.getByTestId('button')
    expect(button).toHaveAttribute('data-variant', 'default')
    expect(button).toHaveAttribute('data-size', 'default')
  })

  it('should handle undefined user gracefully', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: undefined,
    })

    render(<OpenAIAuthButton />)

    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })
})