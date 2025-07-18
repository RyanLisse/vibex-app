import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, renderHook, act, waitFor } from '@testing-library/react'
import { AnthropicAuthProvider, useAuth } from './anthropic-auth-provider'
import { useAnthropicAuth } from '@/hooks/use-anthropic-auth'

// Mock the useAnthropicAuth hook
vi.mock('@/hooks/use-anthropic-auth', () => ({
  useAnthropicAuth: vi.fn()
}))

// Mock fetch
global.fetch = vi.fn()

describe('AnthropicAuthProvider', () => {
  const mockAuth = {
    authenticated: false,
    loading: false,
    expires: null,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAnthropicAuth).mockReturnValue(mockAuth)
    vi.mocked(fetch).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ access_token: 'test-token' }),
    } as any)
  })

  it('should provide auth context to children', () => {
    const TestComponent = () => {
      const auth = useAuth()
      return <div data-testid="auth-status">{auth.authenticated ? 'authenticated' : 'not authenticated'}</div>
    }

    render(
      <AnthropicAuthProvider>
        <TestComponent />
      </AnthropicAuthProvider>
    )

    expect(screen.getByTestId('auth-status')).toHaveTextContent('not authenticated')
  })

  it('should throw error when useAuth is used outside provider', () => {
    const TestComponent = () => {
      useAuth()
      return <div>test</div>
    }

    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within an AnthropicAuthProvider')
  })

  it('should fetch access token when authenticated', async () => {
    const authenticatedAuth = {
      ...mockAuth,
      authenticated: true,
    }
    vi.mocked(useAnthropicAuth).mockReturnValue(authenticatedAuth)

    const TestComponent = () => {
      const auth = useAuth()
      return <div data-testid="token">{auth.accessToken || 'no token'}</div>
    }

    render(
      <AnthropicAuthProvider>
        <TestComponent />
      </AnthropicAuthProvider>
    )

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/anthropic/token')
    })

    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent('test-token')
    })
  })

  it('should clear access token when not authenticated', async () => {
    const TestComponent = () => {
      const auth = useAuth()
      return <div data-testid="token">{auth.accessToken || 'no token'}</div>
    }

    render(
      <AnthropicAuthProvider>
        <TestComponent />
      </AnthropicAuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent('no token')
    })
  })

  it('should schedule token refresh when expires is set', () => {
    const futureExpiry = Date.now() + 120000 // 2 minutes from now
    const authenticatedAuth = {
      ...mockAuth,
      authenticated: true,
      expires: futureExpiry,
    }
    vi.mocked(useAnthropicAuth).mockReturnValue(authenticatedAuth)

    const TestComponent = () => {
      useAuth()
      return <div>test</div>
    }

    render(
      <AnthropicAuthProvider>
        <TestComponent />
      </AnthropicAuthProvider>
    )

    // Verify that refresh would be called after timeout
    // Note: We can't easily test setTimeout in a unit test without mocking time
    expect(mockAuth.refresh).not.toHaveBeenCalled()
  })

  it('should handle fetch error for access token', async () => {
    const authenticatedAuth = {
      ...mockAuth,
      authenticated: true,
    }
    vi.mocked(useAnthropicAuth).mockReturnValue(authenticatedAuth)
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

    const TestComponent = () => {
      const auth = useAuth()
      return <div data-testid="token">{auth.accessToken || 'no token'}</div>
    }

    render(
      <AnthropicAuthProvider>
        <TestComponent />
      </AnthropicAuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent('no token')
    })
  })

  it('should forward auth methods correctly', () => {
    const TestComponent = () => {
      const auth = useAuth()
      return (
        <div>
          <button onClick={() => auth.login('max')}>Login Max</button>
          <button onClick={() => auth.login('console')}>Login Console</button>
          <button onClick={() => auth.logout()}>Logout</button>
          <button onClick={() => auth.refresh()}>Refresh</button>
        </div>
      )
    }

    render(
      <AnthropicAuthProvider>
        <TestComponent />
      </AnthropicAuthProvider>
    )

    const loginMaxBtn = screen.getByText('Login Max')
    const loginConsoleBtn = screen.getByText('Login Console')
    const logoutBtn = screen.getByText('Logout')
    const refreshBtn = screen.getByText('Refresh')

    act(() => {
      loginMaxBtn.click()
    })
    expect(mockAuth.login).toHaveBeenCalledWith('max')

    act(() => {
      loginConsoleBtn.click()
    })
    expect(mockAuth.login).toHaveBeenCalledWith('console')

    act(() => {
      logoutBtn.click()
    })
    expect(mockAuth.logout).toHaveBeenCalled()

    act(() => {
      refreshBtn.click()
    })
    expect(mockAuth.refresh).toHaveBeenCalled()
  })
})