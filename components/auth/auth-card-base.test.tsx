import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { AuthCardBase } from './auth-card-base'

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn((date, options) => {
    if (options?.addSuffix) {
      return 'in 30 minutes'
    }
    return '30 minutes'
  }),
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Shield: ({ className, ...props }: any) => (
    <svg data-testid="shield-icon" className={className} {...props} />
  ),
  AlertCircle: ({ className, ...props }: any) => (
    <svg data-testid="alert-icon" className={className} {...props} />
  ),
  User: ({ className, ...props }: any) => (
    <svg data-testid="user-icon" className={className} {...props} />
  ),
  Clock: ({ className, ...props }: any) => (
    <svg data-testid="clock-icon" className={className} {...props} />
  ),
  LogOut: ({ className, ...props }: any) => (
    <svg data-testid="logout-icon" className={className} {...props} />
  ),
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div data-testid="card-content" className={className} {...props}>
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
    <h3 data-testid="card-title" className={className} {...props}>
      {children}
    </h3>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className, ...props }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      data-variant={variant}
      className={className}
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
        title="Test Authentication"
        loading={true}
        authenticated={false}
        onLogout={mockOnLogout}
      />
    )

    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByTestId('card-title')).toHaveTextContent('Test Authentication')
    expect(screen.getByTestId('shield-icon')).toBeInTheDocument()
    expect(screen.getByTestId('card-description')).toHaveTextContent('Checking authentication status...')
    expect(screen.getByRole('generic')).toHaveClass('animate-spin')
  })

  it('should render loading state with custom description', () => {
    render(
      <AuthCardBase
        title="Test Authentication"
        description="Custom loading message"
        loading={true}
        authenticated={false}
        onLogout={mockOnLogout}
      />
    )

    expect(screen.getByTestId('card-description')).toHaveTextContent('Custom loading message')
  })

  it('should render error state', () => {
    render(
      <AuthCardBase
        title="Test Authentication"
        loading={false}
        authenticated={false}
        error="Authentication failed"
        onLogout={mockOnLogout}
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
        title="Test Authentication"
        loading={false}
        authenticated={false}
        error="Authentication failed"
        onLogout={mockOnLogout}
        onRetry={mockOnRetry}
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
        title="Test Authentication"
        loading={false}
        authenticated={false}
        error="Authentication failed"
        onLogout={mockOnLogout}
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
        title="Test Authentication"
        loading={false}
        authenticated={true}
        onLogout={mockOnLogout}
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
        title="Test Authentication"
        description="Custom success message"
        loading={false}
        authenticated={true}
        onLogout={mockOnLogout}
      />
    )

    expect(screen.getByTestId('card-description')).toHaveTextContent('Custom success message')
  })

  it('should render authenticated state with auth type', () => {
    render(
      <AuthCardBase
        title="Test Authentication"
        loading={false}
        authenticated={true}
        authType="OAuth"
        onLogout={mockOnLogout}
      />
    )

    expect(screen.getByText('Auth Type:')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveTextContent('OAuth')
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'secondary')
  })

  it('should render authenticated state with expiration', () => {
    const futureTime = Date.now() + 1800000 // 30 minutes from now
    render(
      <AuthCardBase
        title="Test Authentication"
        loading={false}
        authenticated={true}
        expires={futureTime}
        onLogout={mockOnLogout}
      />
    )

    expect(screen.getByText('Expires:')).toBeInTheDocument()
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    expect(screen.getByText('in 30 minutes')).toBeInTheDocument()
  })

  it('should render authenticated state with expiring soon warning', () => {
    const futureTime = Date.now() + 1800000
    render(
      <AuthCardBase
        title="Test Authentication"
        loading={false}
        authenticated={true}
        expires={futureTime}
        isExpiringSoon={true}
        onLogout={mockOnLogout}
      />
    )

    expect(screen.getByText('in 30 minutes')).toHaveClass('text-amber-600')
    expect(screen.getByText('Token expires soon. Please re-authenticate.')).toBeInTheDocument()
    expect(screen.getAllByTestId('alert-icon')).toHaveLength(1)
  })

  it('should render authenticated state with authenticated content', () => {
    render(
      <AuthCardBase
        title="Test Authentication"
        loading={false}
        authenticated={true}
        onLogout={mockOnLogout}
        authenticatedContent={<div data-testid="custom-content">Custom auth content</div>}
      />
    )

    expect(screen.getByTestId('custom-content')).toBeInTheDocument()
    expect(screen.getByText('Custom auth content')).toBeInTheDocument()
  })

  it('should handle logout button click', () => {
    render(
      <AuthCardBase
        title="Test Authentication"
        loading={false}
        authenticated={true}
        onLogout={mockOnLogout}
      />
    )

    const logoutButton = screen.getByTestId('button')
    fireEvent.click(logoutButton)

    expect(mockOnLogout).toHaveBeenCalledTimes(1)
  })

  it('should render unauthenticated state', () => {
    render(
      <AuthCardBase
        title="Test Authentication"
        description="Please authenticate"
        loading={false}
        authenticated={false}
        onLogout={mockOnLogout}
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
        title="Test Authentication"
        loading={false}
        authenticated={false}
        onLogout={mockOnLogout}
        unauthenticatedContent={<div data-testid="unauth-content">Login form here</div>}
      />
    )

    expect(screen.getByTestId('unauth-content')).toBeInTheDocument()
    expect(screen.getByText('Login form here')).toBeInTheDocument()
  })

  it('should render unauthenticated state with children', () => {
    render(
      <AuthCardBase
        title="Test Authentication"
        loading={false}
        authenticated={false}
        onLogout={mockOnLogout}
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
        title="Complex Authentication"
        description="Complex test case"
        loading={false}
        authenticated={true}
        expires={Date.now() + 1800000}
        authType="API Key"
        isExpiringSoon={true}
        onLogout={mockOnLogout}
        onRetry={mockOnRetry}
        authenticatedContent={<div data-testid="auth-content">Auth content</div>}
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
        title="Test Authentication"
        loading={false}
        authenticated={false}
        error={null}
        onLogout={mockOnLogout}
      />
    )

    expect(screen.getByTestId('card-title')).toHaveTextContent('Test Authentication')
    expect(screen.queryByText('Authentication Error')).not.toBeInTheDocument()
  })

  it('should handle null expires gracefully', () => {
    render(
      <AuthCardBase
        title="Test Authentication"
        loading={false}
        authenticated={true}
        expires={null}
        onLogout={mockOnLogout}
      />
    )

    expect(screen.queryByText('Expires:')).not.toBeInTheDocument()
  })

  it('should apply correct styling classes', () => {
    render(
      <AuthCardBase
        title="Test Authentication"
        loading={false}
        authenticated={true}
        onLogout={mockOnLogout}
      />
    )

    const cardContent = screen.getByTestId('card-content')
    expect(cardContent).toHaveClass('space-y-4')
  })
})