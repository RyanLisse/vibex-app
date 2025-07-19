import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { AuthCardBase } from '@/components/auth/auth-card-base'

// Mock date-fns
const formatDistanceToNowMock = mock((_date: any, options?: any) => {
  if (options?.addSuffix) {
    return 'in 30 minutes'
  }
  return '30 minutes'
})

// Mock window.location.reload
const mockReload = mock()
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
})

describe('AuthCardBase', () => {
  const mockOnLogout = mock()
  const mockOnRetry = mock()

  beforeEach(() => {
    mockOnLogout.mockReset()
    mockOnRetry.mockReset()
    mockReload.mockReset()
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

    expect(screen.getByTestId('card')).toBeTruthy()
    expect(screen.getByTestId('card-title')).toHaveTextContent('Test Authentication')
    expect(screen.getByTestId('shield-icon')).toBeTruthy()
    expect(screen.getByTestId('card-description')).toHaveTextContent(
      'Checking authentication status...'
    )
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
    expect(screen.getByTestId('alert-icon')).toBeTruthy()
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
    expect(screen.getByTestId('user-icon')).toBeTruthy()
    expect(screen.getByTestId('card-description')).toHaveTextContent('Successfully authenticated')
    expect(screen.getByTestId('button')).toHaveTextContent('Logout')
  })
})
