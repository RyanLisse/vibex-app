// Enhanced Next.js Router Mocking Utilities
// Comprehensive router mocking beyond basic setup

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { ReadonlyURLSearchParams } from 'next/navigation'
import { vi } from 'vitest'

// Default mock router
export const mockRouter: AppRouterInstance = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
}

// Enhanced router state management
export interface RouterState {
  pathname: string
  searchParams: URLSearchParams
  route: string
  query: Record<string, string | string[]>
  asPath: string
  basePath: string
  locale?: string
  locales?: string[]
  defaultLocale?: string
  isFallback: boolean
  isPreview: boolean
  isReady: boolean
}

let routerState: RouterState = {
  pathname: '/',
  searchParams: new URLSearchParams(),
  route: '/',
  query: {},
  asPath: '/',
  basePath: '',
  isFallback: false,
  isPreview: false,
  isReady: true,
}

// Router state management utilities
export const routerUtils = {
  // Set current route state
  setRoute: (pathname: string, searchParams?: Record<string, string>) => {
    routerState.pathname = pathname
    routerState.asPath = pathname
    routerState.route = pathname

    if (searchParams) {
      routerState.searchParams = new URLSearchParams(searchParams)
      routerState.query = { ...searchParams }
      routerState.asPath = `${pathname}?${routerState.searchParams.toString()}`
    }
  },

  // Simulate navigation
  navigateTo: (path: string, options?: { replace?: boolean }) => {
    const url = new URL(path, 'http://localhost')
    routerState.pathname = url.pathname
    routerState.asPath = url.pathname + url.search
    routerState.route = url.pathname
    routerState.searchParams = new URLSearchParams(url.search)
    routerState.query = Object.fromEntries(url.searchParams)

    if (options?.replace) {
      mockRouter.replace(path)
    } else {
      mockRouter.push(path)
    }
  },

  // Get current state
  getState: () => ({ ...routerState }),

  // Reset to initial state
  reset: () => {
    routerState = {
      pathname: '/',
      searchParams: new URLSearchParams(),
      route: '/',
      query: {},
      asPath: '/',
      basePath: '',
      isFallback: false,
      isPreview: false,
      isReady: true,
    }
    vi.clearAllMocks()
  },

  // Simulate loading state
  setLoading: (isLoading: boolean) => {
    routerState.isReady = !isLoading
  },

  // Simulate preview mode
  setPreview: (isPreview: boolean) => {
    routerState.isPreview = isPreview
  },

  // Mock push with delay (for testing loading states)
  mockPushWithDelay: (delay = 100) => {
    mockRouter.push = vi.fn().mockImplementation((path: string) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          routerUtils.navigateTo(path)
          resolve(undefined)
        }, delay)
      })
    })
  },

  // Mock failed navigation
  mockFailedNavigation: (error: Error) => {
    mockRouter.push = vi.fn().mockRejectedValue(error)
    mockRouter.replace = vi.fn().mockRejectedValue(error)
  },
}

// Enhanced useRouter mock
export const mockUseRouter = () => ({
  ...mockRouter,
  pathname: routerState.pathname,
  route: routerState.route,
  asPath: routerState.asPath,
  query: routerState.query,
  basePath: routerState.basePath,
  locale: routerState.locale,
  locales: routerState.locales,
  defaultLocale: routerState.defaultLocale,
  isFallback: routerState.isFallback,
  isPreview: routerState.isPreview,
  isReady: routerState.isReady,
})

// Enhanced usePathname mock
export const mockUsePathname = () => routerState.pathname

// Enhanced useSearchParams mock
export const mockUseSearchParams = (): ReadonlyURLSearchParams => {
  const searchParams = routerState.searchParams
  return {
    get: (key: string) => searchParams.get(key),
    getAll: (key: string) => searchParams.getAll(key),
    has: (key: string) => searchParams.has(key),
    keys: () => searchParams.keys(),
    values: () => searchParams.values(),
    entries: () => searchParams.entries(),
    forEach: (callbackfn: (value: string, key: string, parent: URLSearchParams) => void) =>
      searchParams.forEach(callbackfn),
    toString: () => searchParams.toString(),
    size: searchParams.size,
    [Symbol.iterator]: () => searchParams[Symbol.iterator](),
  }
}

// Enhanced useParams mock
export const mockUseParams = () => {
  const pathSegments = routerState.pathname.split('/').filter(Boolean)
  const params: Record<string, string> = {}

  // Extract dynamic route parameters (basic implementation)
  pathSegments.forEach((segment, index) => {
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const paramName = segment.slice(1, -1)
      params[paramName] = pathSegments[index] || ''
    }
  })

  return params
}

// Setup function to apply all mocks
export const setupRouterMocks = () => {
  vi.mock('next/navigation', () => ({
    useRouter: mockUseRouter,
    usePathname: mockUsePathname,
    useSearchParams: mockUseSearchParams,
    useParams: mockUseParams,
    notFound: vi.fn(),
    redirect: vi.fn(),
    permanentRedirect: vi.fn(),
  }))
}

// Test helpers for router testing
export const routerTestHelpers = {
  // Assert navigation occurred
  expectNavigation: (path: string, options?: { replace?: boolean }) => {
    const method = options?.replace ? 'replace' : 'push'
    expect(mockRouter[method]).toHaveBeenCalledWith(path)
  },

  // Assert current pathname
  expectPathname: (pathname: string) => {
    expect(routerState.pathname).toBe(pathname)
  },

  // Assert search params
  expectSearchParams: (params: Record<string, string>) => {
    Object.entries(params).forEach(([key, value]) => {
      expect(routerState.searchParams.get(key)).toBe(value)
    })
  },

  // Wait for navigation to complete
  waitForNavigation: async (timeout = 1000) => {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (routerState.isReady) {
          resolve(undefined)
        } else {
          setTimeout(checkReady, 10)
        }
      }
      checkReady()
      setTimeout(() => resolve(undefined), timeout)
    })
  },

  // Simulate back/forward navigation
  simulateHistoryNavigation: (delta: number) => {
    if (delta < 0) {
      mockRouter.back()
    } else if (delta > 0) {
      mockRouter.forward()
    }
  },
}

// Export setup function for easy integration
export const setupNextRouterMocks = () => {
  setupRouterMocks()
  routerUtils.reset()
}

// Cleanup function
export const cleanupRouterMocks = () => {
  routerUtils.reset()
  vi.clearAllMocks()
}
