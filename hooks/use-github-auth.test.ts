import { afterEach, beforeEach, describe, expect, it, mock, spyOn, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useGitHubAuth } from '@/hooks/use-github-auth'

// Mock next/navigation
mock('next/navigation', () => ({
  useRouter: mock(),
}))

// Mock fetch
global.fetch = mock()

describe('useGitHubAuth', () => {
  const mockPush = mock()
  const mockRouter = { push: mockPush }

  beforeEach(() => {
    mock.restore()
    ;(useRouter as any).mockReturnValue(mockRouter as any)
    window.location.href = 'http://localhost:3000'
  })

  describe('initial state', () => {
    it('should have default values', () => {
      const { result } = renderHook(() => useGitHubAuth())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('login', () => {
    it('should initiate login successfully', async () => {
      const mockAuthUrl = 'https://github.com/oauth/authorize?client_id=test'
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: mockAuthUrl }),
      } as Response)

      const { result } = renderHook(() => useGitHubAuth())

      await act(async () => {
        await result.current.login()
      })

      expect(fetch).toHaveBeenCalledWith('/api/auth/github/url')
      expect(window.location.href).toBe(mockAuthUrl)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle login error when fetch fails', async () => {
      ;(fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useGitHubAuth())

      await act(async () => {
        await result.current.login()
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle login error when response is not ok', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response)

      const { result } = renderHook(() => useGitHubAuth())

      await act(async () => {
        await result.current.login()
      })

      expect(result.current.error).toBe('Failed to get GitHub auth URL: Internal Server Error')
    })

    it('should set isLoading during login', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      ;(fetch as any).mockReturnValueOnce(promise as any)

      const { result } = renderHook(() => useGitHubAuth())

      act(() => {
        result.current.login()
      })

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        resolvePromise?.({
          ok: true,
          json: async () => ({ url: 'https://github.com/oauth' }),
        })
        await promise
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('logout', () => {
    it('should logout successfully', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
      } as Response)

      const { result } = renderHook(() => useGitHubAuth())

      await act(async () => {
        await result.current.logout()
      })

      expect(fetch).toHaveBeenCalledWith('/api/auth/github/logout', {
        method: 'POST',
      })
      expect(mockPush).toHaveBeenCalledWith('/')
      expect(result.current.error).toBeNull()
    })

    it('should handle logout error', async () => {
      ;(fetch as any).mockRejectedValueOnce(new Error('Logout failed'))

      const { result } = renderHook(() => useGitHubAuth())

      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.error).toBe('Logout failed')
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should set isLoading during logout', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      ;(fetch as any).mockReturnValueOnce(promise as any)

      const { result } = renderHook(() => useGitHubAuth())

      act(() => {
        result.current.logout()
      })

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        resolvePromise?.({ ok: true })
        await promise
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should clear error when starting new operation', async () => {
      // First, create an error
      ;(fetch as any).mockRejectedValueOnce(new Error('First error'))
      const { result } = renderHook(() => useGitHubAuth())

      await act(async () => {
        await result.current.login()
      })

      expect(result.current.error).toBe('First error')

      // Then try another operation
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://github.com/oauth' }),
      } as Response)

      await act(async () => {
        await result.current.login()
      })

      expect(result.current.error).toBeNull()
    })
  })
})
