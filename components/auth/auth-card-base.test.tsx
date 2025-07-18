import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AuthCardBase } from '@/components/auth/auth-card-base'

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
  Shield: ({ className, ...props }: any) => (
    <svg className={className} data-testid="shield-icon" {...props} />
  ),
  AlertCircle: ({ className, ...props }: any) => (
    <svg className={className} data-testid="alert-icon" {...props} />
  ),
  User: ({ className, ...props }: any) => (
    <svg className={className} data-testid="user-icon" {...props} />
  ),
  Clock: ({ className, ...props }: any) => (
    <svg className={className} data-testid="clock-icon" {...props} />
  ),
  LogOut: ({ className, ...props }: any) => (
    <svg className={className} data-testid="logout-icon" {...props} />
  ),
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="card-content" {...props}>
      {children}
    </div>
  ),
  CardDescription: ({ children, ...props }: any) => (
    <p data-testid="card-description" {...props}>
      {children}
    </p>
  ),
  CardHeader: ({ children, ...props }: any) => (
    <div data-testid="card-header" {...props}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className, ...props }: any) => (
    <h3 className={className} data-testid="card-title" {...props}>
      {children}
    </h3>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className, ...props }: any) => (
    <button
      className={className}
      data-testid="button"
      data-variant={variant}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: any) => (
    <span data-testid="badge" data-variant={variant} {...props}>
      {children}
    </span>
  ),
}))

// Mock window.location.reload
const mockReload = vi.fn()
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
})

describe('AuthCardBase', () => {
  const mockOnLogout = vi.fn()
  const mockOnRetry = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state', () => {
    render(
      <AuthCardBase
        authenticated={false}
        loading={true}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByTestId('card-title')).toHaveTextContent('Test Authentication')
    expect(screen.getByTestId('shield-icon')).toBeInTheDocument()
    expect(screen.getByTestId('card-description')).toHaveTextContent(
      'Checking authentication status...'
    )
    expect(screen.getByRole('generic')).toHaveClass('animate-spin')
  })

  it('should render loading state with custom description', () => {
    render(
      <AuthCardBase
        authenticated={false}
        description="Custom loading message"
        loading={true}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    expect(screen.getByTestId('card-description')).toHaveTextContent('Custom loading message')
  })

  it('should render error state', () => {
    render(
      <AuthCardBase
        authenticated={false}
        error="Authentication failed"
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    expect(screen.getByTestId('card')).toHaveClass('border-red-200')
    expect(screen.getByTestId('card-title')).toHaveTextContent('Authentication Error')
    expect(screen.getByTestId('card-title')).toHaveClass('text-red-600')
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
    expect(screen.getByTestId('card-description')).toHaveTextContent('Authentication failed')
    expect(screen.getByTestId('button')).toHaveTextContent('Retry')
  })

  it('should handle retry button click with custom handler', () => {
    render(
      <AuthCardBase
        authenticated={false}
        error="Authentication failed"
        loading={false}
        onLogout={mockOnLogout}
        onRetry={mockOnRetry}
        title="Test Authentication"
      />
    )

    const retryButton = screen.getByTestId('button')
    fireEvent.click(retryButton)

    expect(mockOnRetry).toHaveBeenCalledTimes(1)
    expect(mockReload).not.toHaveBeenCalled()
  })

  it('should handle retry button click with default handler', () => {
    render(
      <AuthCardBase
        authenticated={false}
        error="Authentication failed"
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    const retryButton = screen.getByTestId('button')
    fireEvent.click(retryButton)

    expect(mockReload).toHaveBeenCalledTimes(1)
    expect(mockOnRetry).not.toHaveBeenCalled()
  })

  it('should render authenticated state', () => {
    render(
      <AuthCardBase
        authenticated={true}
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    expect(screen.getByTestId('card')).toHaveClass('border-green-200')
    expect(screen.getByTestId('card-title')).toHaveTextContent('Test Authenticated')
    expect(screen.getByTestId('card-title')).toHaveClass('text-green-600')
    expect(screen.getByTestId('user-icon')).toBeInTheDocument()
    expect(screen.getByTestId('card-description')).toHaveTextContent('Successfully authenticated')
    expect(screen.getByTestId('button')).toHaveTextContent('Logout')
    expect(screen.getByTestId('logout-icon')).toBeInTheDocument()
  })

  it('should render authenticated state with custom description', () => {
    render(
      <AuthCardBase
        authenticated={true}
        description="Custom success message"
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    expect(screen.getByTestId('card-description')).toHaveTextContent('Custom success message')
  })

  it('should render authenticated state with auth type', () => {
    render(
      <AuthCardBase
        authenticated={true}
        authType="OAuth"
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    expect(screen.getByText('Auth Type:')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveTextContent('OAuth')
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'secondary')
  })

  it('should render authenticated state with expiration', () => {
    const futureTime = Date.now() + 1_800_000 // 30 minutes from now
    render(
      <AuthCardBase
        authenticated={true}
        expires={futureTime}
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    expect(screen.getByText('Expires:')).toBeInTheDocument()
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    expect(screen.getByText('in 30 minutes')).toBeInTheDocument()
  })

  it('should render authenticated state with expiring soon warning', () => {
    const futureTime = Date.now() + 1_800_000
    render(
      <AuthCardBase
        authenticated={true}
        expires={futureTime}
        isExpiringSoon={true}
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    expect(screen.getByText('in 30 minutes')).toHaveClass('text-amber-600')
    expect(screen.getByText('Token expires soon. Please re-authenticate.')).toBeInTheDocument()
    expect(screen.getAllByTestId('alert-icon')).toHaveLength(1)
  })

  it('should render authenticated state with authenticated content', () => {
    render(
      <AuthCardBase
        authenticated={true}
        authenticatedContent={<div data-testid="custom-content">Custom auth content</div>}
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    expect(screen.getByTestId('custom-content')).toBeInTheDocument()
    expect(screen.getByText('Custom auth content')).toBeInTheDocument()
  })

  it('should handle logout button click', () => {
    render(
      <AuthCardBase
        authenticated={true}
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    const logoutButton = screen.getByTestId('button')
    fireEvent.click(logoutButton)

    expect(mockOnLogout).toHaveBeenCalledTimes(1)
  })

  it('should render unauthenticated state', () => {
    render(
      <AuthCardBase
        authenticated={false}
        description="Please authenticate"
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    expect(screen.getByTestId('card')).toHaveClass('w-full', 'max-w-md')
    expect(screen.getByTestId('card-title')).toHaveTextContent('Test Authentication')
    expect(screen.getByTestId('shield-icon')).toBeInTheDocument()
    expect(screen.getByTestId('card-description')).toHaveTextContent('Please authenticate')
  })

  it('should render unauthenticated state with content', () => {
    render(
      <AuthCardBase
        authenticated={false}
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
        unauthenticatedContent={<div data-testid="unauth-content">Login form here</div>}
      />
    )

    expect(screen.getByTestId('unauth-content')).toBeInTheDocument()
    expect(screen.getByText('Login form here')).toBeInTheDocument()
  })

  it('should render unauthenticated state with children', () => {
    render(
      <AuthCardBase
        authenticated={false}
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
      >
        <div data-testid="children-content">Child content</div>
      </AuthCardBase>
    )

    expect(screen.getByTestId('children-content')).toBeInTheDocument()
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('should handle all props combinations', () => {
    render(
      <AuthCardBase
        authenticated={true}
        authenticatedContent={<div data-testid="auth-content">Auth content</div>}
        authType="API Key"
        description="Complex test case"
        expires={Date.now() + 1_800_000}
        isExpiringSoon={true}
        loading={false}
        onLogout={mockOnLogout}
        onRetry={mockOnRetry}
        title="Complex Authentication"
      />
    )

    expect(screen.getByTestId('card-title')).toHaveTextContent('Complex Authenticated')
    expect(screen.getByTestId('card-description')).toHaveTextContent('Complex test case')
    expect(screen.getByTestId('badge')).toHaveTextContent('API Key')
    expect(screen.getByText('in 30 minutes')).toHaveClass('text-amber-600')
    expect(screen.getByText('Token expires soon. Please re-authenticate.')).toBeInTheDocument()
    expect(screen.getByTestId('auth-content')).toBeInTheDocument()
  })

  it('should handle null error gracefully', () => {
    render(
      <AuthCardBase
        authenticated={false}
        error={null}
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    expect(screen.getByTestId('card-title')).toHaveTextContent('Test Authentication')
    expect(screen.queryByText('Authentication Error')).not.toBeInTheDocument()
  })

  it('should handle null expires gracefully', () => {
    render(
      <AuthCardBase
        authenticated={true}
        expires={null}
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    expect(screen.queryByText('Expires:')).not.toBeInTheDocument()
  })

  it('should apply correct styling classes', () => {
    render(
      <AuthCardBase
        authenticated={true}
        loading={false}
        onLogout={mockOnLogout}
        title="Test Authentication"
      />
    )

    const cardContent = screen.getByTestId('card-content')
    expect(cardContent).toHaveClass('space-y-4')
  })
})
