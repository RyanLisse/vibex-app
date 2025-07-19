import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAnthropicAuth } from '@/hooks/use-anthropic-auth'
import { useAuthBase } from '@/hooks/use-auth-base'

// Mock the base auth hook
vi.mock('./use-auth-base', () => ({
  useAuthBase: vi.fn(),
}))

describe('useAnthropicAuth', () => {
  const mockBaseAuth = {
    authenticated: false,
    loading: true,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuthBase as any).mockReturnValue(mockBaseAuth)
  })

  it('should initialize with correct endpoints', () => {
    renderHook(() => useAnthropicAuth())

    expect(useAuthBase).toHaveBeenCalledWith(
      {
        statusEndpoint: '/api/auth/anthropic/status',
        logoutEndpoint: '/api/auth/anthropic/logout',
        authorizeEndpoint: '/api/auth/anthropic/authorize',
      },
      {
        authenticated: false,
        loading: true,
      }
    )
  })

  it('should return all base auth properties', () => {
    const { result } = renderHook(() => useAnthropicAuth())

    expect(result.current).toMatchObject({
      authenticated: false,
      loading: true,
      logout: expect.any(Function),
      refresh: expect.any(Function),
      login: expect.any(Function),
    })
  })

  it('should wrap login with mode parameter', () => {
    const { result } = renderHook(() => useAnthropicAuth())

    act(() => {
      result.current.login('max')
    })

    expect(mockBaseAuth.login).toHaveBeenCalledWith({ mode: 'max' })
  })

  it('should use default mode "max" when not specified', () => {
    const { result } = renderHook(() => useAnthropicAuth())

    act(() => {
      result.current.login()
    })

    expect(mockBaseAuth.login).toHaveBeenCalledWith({ mode: 'max' })
  })

  it('should support console mode', () => {
    const { result } = renderHook(() => useAnthropicAuth())

    act(() => {
      result.current.login('console')
    })

    expect(mockBaseAuth.login).toHaveBeenCalledWith({ mode: 'console' })
  })

  it('should update when base auth updates', () => {
    const { result, rerender } = renderHook(() => useAnthropicAuth())

    expect(result.current.authenticated).toBe(false)
    expect(result.current.loading).toBe(true)

    // Update the mock to return different values
    ;(useAuthBase as any).mockReturnValue({
      ...mockBaseAuth,
      authenticated: true,
      loading: false,
      type: 'oauth',
      expires: Date.now() + 3_600_000,
    })

    rerender()

    expect(result.current.authenticated).toBe(true)
    expect(result.current.loading).toBe(false)
    expect(result.current.type).toBe('oauth')
    expect(result.current.expires).toBeDefined()
  })

  it('should handle error states from base auth', () => {
    ;(useAuthBase as any).mockReturnValue({
      ...mockBaseAuth,
      loading: false,
      error: 'Authentication failed',
    })

    const { result } = renderHook(() => useAnthropicAuth())

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Authentication failed')
  })

  it('should preserve logout functionality', () => {
    const { result } = renderHook(() => useAnthropicAuth())

    act(() => {
      result.current.logout()
    })

    expect(mockBaseAuth.logout).toHaveBeenCalled()
  })

  it('should preserve refresh functionality', () => {
    const { result } = renderHook(() => useAnthropicAuth())

    act(() => {
      result.current.refresh()
    })

    expect(mockBaseAuth.refresh).toHaveBeenCalled()
  })
})
