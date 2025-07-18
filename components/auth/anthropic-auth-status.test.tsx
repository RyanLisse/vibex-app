import { fireEvent, render, screen } from '@testing-library/react'
import { AnthropicAuthStatus } from '@/components/auth/anthropic-auth-status'

// Mock the anthropic auth hook
const mockUseAnthropicAuth = mock()
mock('@/hooks/use-anthropic-auth', () => ({
  useAnthropicAuth: () => mockUseAnthropicAuth(),
}))

// Mock date-fns
mock('date-fns', () => ({
  formatDistanceToNow: mock((_date, options) => {
    if (options?.addSuffix) {
      return 'in 30 minutes'
    }
    return '30 minutes'
  }),
}))

// Mock Lucide React icons
mock('lucide-react', () => ({
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
mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span className={className} data-testid="badge" data-variant={variant} {...props}>
      {children}
    </span>
  ),
}))

mock('@/components/ui/button', () => ({
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

describe('AnthropicAuthStatus', () => {
  const mockLogin = mock()
  const mockLogout = mock()

  beforeEach(() => {
    mock.restore()
  })

  it('should render loading state', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: false,
      loading: true,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: null,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus />)

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveTextContent('Loading...')
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'secondary')
  })

  it('should render authenticated state', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus />)

    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveTextContent('Connected')
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'success')
  })

  it('should render unauthenticated state', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: null,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus />)

    expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveTextContent('Disconnected')
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'destructive')
  })

  it('should render error state', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: 'Authentication failed',
      expires: null,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus />)

    expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveTextContent('Error')
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'destructive')
  })

  it('should render expiring soon state', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: Date.now() + 300_000, // 5 minutes
      isExpiring: true,
    })

    render(<AnthropicAuthStatus />)

    expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveTextContent('Expiring Soon')
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'warning')
  })

  it('should render with detailed view', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus showDetails={true} />)

    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Expires: in 30 minutes')).toBeInTheDocument()
    expect(screen.getByTestId('button')).toHaveTextContent('Logout')
  })

  it('should render with actions', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: null,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus showActions={true} />)

    expect(screen.getByTestId('button')).toHaveTextContent('Connect')
  })

  it('should handle login button click', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: null,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus showActions={true} />)

    const loginButton = screen.getByTestId('button')
    fireEvent.click(loginButton)

    expect(mockLogin).toHaveBeenCalledTimes(1)
  })

  it('should handle logout button click', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus showActions={true} />)

    const logoutButton = screen.getByTestId('button')
    fireEvent.click(logoutButton)

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('should render with compact view', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus variant="compact" />)

    expect(screen.getByTestId('badge')).toHaveClass('px-2', 'py-1', 'text-xs')
  })

  it('should render with custom className', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus className="custom-class" />)

    const container = screen.getByTestId('badge').parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('should handle user without email', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { name: 'Test User' },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus showDetails={true} />)

    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('should handle null user when authenticated', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus showDetails={true} />)

    expect(screen.getByText('Anthropic User')).toBeInTheDocument()
  })

  it('should handle expired tokens', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: Date.now() - 1000, // expired
      isExpiring: false,
    })

    render(<AnthropicAuthStatus showDetails={true} />)

    expect(screen.getByText('Token expired')).toBeInTheDocument()
  })

  it('should handle missing expiration date', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: null,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus showDetails={true} />)

    expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument()
  })

  it('should handle button disabled state during loading', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: false,
      loading: true,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: null,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus showActions={true} />)

    const button = screen.getByTestId('button')
    expect(button).toBeDisabled()
  })

  it('should handle detailed error information', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: 'Network connection failed',
      expires: null,
      isExpiring: false,
    })

    render(<AnthropicAuthStatus showDetails={true} />)

    expect(screen.getByText('Network connection failed')).toBeInTheDocument()
  })

  it('should handle authentication state transitions', () => {
    mockUseAnthropicAuth.mockReturnValue({
      authenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: null,
      error: null,
      expires: null,
      isExpiring: false,
    })

    const { rerender } = render(<AnthropicAuthStatus />)
    expect(screen.getByTestId('badge')).toHaveTextContent('Disconnected')

    mockUseAnthropicAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      user: { email: 'test@example.com' },
      error: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })

    rerender(<AnthropicAuthStatus />)
    expect(screen.getByTestId('badge')).toHaveTextContent('Connected')
  })
})
