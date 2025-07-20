import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { OpenAIAuthStatus } from '@/components/auth/openai-auth-status'

// Mock the openai auth hook
const mockUseOpenAIAuth = vi.fn()
vi.mock('@/hooks/use-openai-auth', () => ({
  useOpenAIAuth: () => mockUseOpenAIAuth(),
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn((_date, options) => {
    if (options?.addSuffix) {
      return 'in 30 minutes'
    }
    return '30 minutes'
  }),
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  CheckCircle: ({ className, ...props }: any) => (
    <svg className={className} data-testid="check-circle-icon" {...props} />
  ),
  XCircle: ({ className, ...props }: any) => (
    <svg className={className} data-testid="x-circle-icon" {...props} />
  ),
  AlertCircle: ({ className, ...props }: any) => (
    <svg className={className} data-testid="alert-circle-icon" {...props} />
  ),
  Clock: ({ className, ...props }: any) => (
    <svg className={className} data-testid="clock-icon" {...props} />
  ),
  Loader2: ({ className, ...props }: any) => (
    <svg className={className} data-testid="loader-icon" {...props} />
  ),
}))

// Mock UI components
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span className={className} data-testid="badge" data-variant={variant} {...props}>
      {children}
    </span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, ...props }: any) => (
    <button
      className={className}
      data-size={size}
      data-testid="button"
      data-variant={variant}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  ),
}))

describe('OpenAIAuthStatus', () => {
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
      error: null,
      expires: null,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus />)

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveTextContent('Loading...')
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'secondary')
  })

  it('should render authenticated state', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus />)

    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveTextContent('Connected')
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'success')
  })

  it('should render unauthenticated state', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: null,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus />)

    expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveTextContent('Disconnected')
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'destructive')
  })

  it('should render error state', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: 'Authentication failed',
      expires: null,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus />)

    expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveTextContent('Error')
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'destructive')
  })

  it('should render expiring soon state', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: Date.now() + 300_000, // 5 minutes
      isExpiring: true,
    })

    render(<OpenAIAuthStatus />)

    expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveTextContent('Expiring Soon')
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'warning')
  })

  it('should render with detailed view', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus showDetails={true} />)

    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Expires: in 30 minutes')).toBeInTheDocument()
    expect(screen.getByTestId('button')).toHaveTextContent('Logout')
  })

  it('should render with actions', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: null,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus showActions={true} />)

    expect(screen.getByTestId('button')).toHaveTextContent('Connect')
  })

  it('should handle login button click', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: null,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus showActions={true} />)

    const loginButton = screen.getByTestId('button')
    fireEvent.click(loginButton)

    expect(mockLogin).toHaveBeenCalledTimes(1)
  })

  it('should handle logout button click', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus showActions={true} />)

    const logoutButton = screen.getByTestId('button')
    fireEvent.click(logoutButton)

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('should render with compact view', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus variant="compact" />)

    expect(screen.getByTestId('badge')).toHaveClass('px-2', 'py-1', 'text-xs')
  })

  it('should render with custom className', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus className="custom-class" />)

    const container = screen.getByTestId('badge').parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('should handle user with organization', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: {
        email: 'test@example.com',
        organization_id: 'org-123',
        credits_granted: 100,
      },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus showDetails={true} />)

    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Organization: org-123')).toBeInTheDocument()
    expect(screen.getByText('Credits: 100')).toBeInTheDocument()
  })

  it('should handle user without email', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { name: 'Test User' },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus showDetails={true} />)

    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('should handle null user when authenticated', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus showDetails={true} />)

    expect(screen.getByText('OpenAI User')).toBeInTheDocument()
  })

  it('should handle expired tokens', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: Date.now() - 1000, // expired
      isExpiring: false,
    })

    render(<OpenAIAuthStatus showDetails={true} />)

    expect(screen.getByText('Token expired')).toBeInTheDocument()
  })

  it('should handle missing expiration date', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: null,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus showDetails={true} />)

    expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument()
  })

  it('should handle button disabled state during loading', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: true,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: null,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus showActions={true} />)

    const button = screen.getByTestId('button')
    expect(button).toBeDisabled()
  })

  it('should handle detailed error information', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: 'API quota exceeded',
      expires: null,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus showDetails={true} />)

    expect(screen.getByText('API quota exceeded')).toBeInTheDocument()
  })

  it('should handle authentication state transitions', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: null,
      isExpiring: false,
    })

    const { rerender } = render(<OpenAIAuthStatus />)
    expect(screen.getByTestId('badge')).toHaveTextContent('Disconnected')

    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    rerender(<OpenAIAuthStatus />)
    expect(screen.getByTestId('badge')).toHaveTextContent('Connected')
  })

  it('should handle user with usage information', () => {
    mockUseOpenAIAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: {
        email: 'test@example.com',
        usage: {
          total_tokens: 1000,
          prompt_tokens: 800,
          completion_tokens: 200,
        },
      },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<OpenAIAuthStatus showDetails={true} />)

    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Usage: 1000 tokens')).toBeInTheDocument()
  })
})
