/**
 * Bun Mock Utilities
 * Standardized mock utilities for Bun test runner
 * Replaces Vitest mocked() patterns with proper Bun equivalents
 */

import { mock } from 'bun:test'

// Type utilities for better TypeScript support
export type MockedFunction<T extends (...args: any[]) => any> = ReturnType<typeof mock<T>>

export type MockedObject<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? MockedFunction<T[K]> : T[K]
}

// Mock creation utilities
export const createMockFunction = <T extends (...args: any[]) => any>(
  implementation?: T
): MockedFunction<T> => {
  return implementation ? mock(implementation) : mock()
}

export const createMockObject = <T extends Record<string, any>>(
  obj: T
): MockedObject<T> => {
  const mockObj = {} as MockedObject<T>
  
  for (const key in obj) {
    if (typeof obj[key] === 'function') {
      mockObj[key] = mock(obj[key]) as any
    } else {
      mockObj[key] = obj[key]
    }
  }
  
  return mockObj
}

// Fetch mock utilities
export const createFetchMock = () => {
  const mockFetch = mock()
  global.fetch = mockFetch
  return mockFetch
}

export const mockFetchSuccess = (data: any, options?: { status?: number; headers?: Record<string, string> }) => {
  const mockResponse = {
    ok: true,
    status: options?.status || 200,
    json: mock(async () => data),
    text: mock(async () => JSON.stringify(data)),
    headers: new Headers(options?.headers || {}),
  }
  
  ;(global.fetch as any).mockResolvedValue(mockResponse)
  return mockResponse
}

export const mockFetchError = (error: string | Error, options?: { status?: number }) => {
  const errorObj = typeof error === 'string' ? new Error(error) : error
  const mockResponse = {
    ok: false,
    status: options?.status || 500,
    statusText: errorObj.message,
    json: mock(async () => { throw errorObj }),
    text: mock(async () => { throw errorObj }),
  }
  
  ;(global.fetch as any).mockResolvedValue(mockResponse)
  return mockResponse
}

export const mockFetchRejection = (error: string | Error) => {
  const errorObj = typeof error === 'string' ? new Error(error) : error
  ;(global.fetch as any).mockRejectedValue(errorObj)
  return errorObj
}

// Common mock patterns
export const mockNextRouter = () => {
  const mockPush = mock()
  const mockReplace = mock()
  const mockBack = mock()
  const mockForward = mock()
  const mockRefresh = mock()
  
  const mockRouter = {
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    forward: mockForward,
    refresh: mockRefresh,
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    events: {
      on: mock(),
      off: mock(),
      emit: mock(),
    },
  }
  
  return { mockRouter, mockPush, mockReplace, mockBack, mockForward, mockRefresh }
}

export const mockNextCookies = () => {
  const mockGet = mock()
  const mockSet = mock()
  const mockDelete = mock()
  
  const mockCookies = {
    get: mockGet,
    set: mockSet,
    delete: mockDelete,
  }
  
  return { mockCookies, mockGet, mockSet, mockDelete }
}

// Browser API mocks
export const mockNavigatorClipboard = () => {
  const mockWriteText = mock(() => Promise.resolve())
  const mockReadText = mock(() => Promise.resolve(''))
  
  const mockClipboard = {
    writeText: mockWriteText,
    readText: mockReadText,
  }
  
  Object.defineProperty(navigator, 'clipboard', {
    value: mockClipboard,
    writable: true,
    configurable: true,
  })
  
  return { mockClipboard, mockWriteText, mockReadText }
}

export const mockLocalStorage = () => {
  const store = new Map<string, string>()
  
  const mockGetItem = mock((key: string) => store.get(key) || null)
  const mockSetItem = mock((key: string, value: string) => {
    store.set(key, value)
  })
  const mockRemoveItem = mock((key: string) => {
    store.delete(key)
  })
  const mockClear = mock(() => {
    store.clear()
  })
  
  const mockStorage = {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
    clear: mockClear,
    length: 0,
    key: mock(() => null),
  }
  
  Object.defineProperty(global, 'localStorage', {
    value: mockStorage,
    writable: true,
    configurable: true,
  })
  
  return { mockStorage, mockGetItem, mockSetItem, mockRemoveItem, mockClear }
}

// Mock cleanup utilities
export const resetAllMocks = () => {
  mock.restore()
}

export const resetMockFunction = <T extends (...args: any[]) => any>(
  mockFn: MockedFunction<T>
) => {
  mockFn.mockClear()
  mockFn.mockReset()
}

// Mock implementation utilities
export const mockImplementationOnce = <T extends (...args: any[]) => any>(
  mockFn: MockedFunction<T>,
  implementation: T
) => {
  mockFn.mockImplementationOnce(implementation)
}

export const mockReturnValue = <T extends (...args: any[]) => any>(
  mockFn: MockedFunction<T>,
  value: ReturnType<T>
) => {
  mockFn.mockReturnValue(value)
}

export const mockReturnValueOnce = <T extends (...args: any[]) => any>(
  mockFn: MockedFunction<T>,
  value: ReturnType<T>
) => {
  mockFn.mockReturnValueOnce(value)
}

export const mockResolvedValue = <T extends (...args: any[]) => Promise<any>>(
  mockFn: MockedFunction<T>,
  value: Awaited<ReturnType<T>>
) => {
  mockFn.mockResolvedValue(value)
}

export const mockResolvedValueOnce = <T extends (...args: any[]) => Promise<any>>(
  mockFn: MockedFunction<T>,
  value: Awaited<ReturnType<T>>
) => {
  mockFn.mockResolvedValueOnce(value)
}

export const mockRejectedValue = <T extends (...args: any[]) => Promise<any>>(
  mockFn: MockedFunction<T>,
  error: any
) => {
  mockFn.mockRejectedValue(error)
}

export const mockRejectedValueOnce = <T extends (...args: any[]) => Promise<any>>(
  mockFn: MockedFunction<T>,
  error: any
) => {
  mockRejectedValueOnce(error)
}

// Module mocking utilities
export const mockModule = (modulePath: string, factory: () => any) => {
  mock.module(modulePath, factory)
}

export const mockModulePartial = <T>(modulePath: string, partialMock: Partial<T>) => {
  mock.module(modulePath, () => ({
    ...require(modulePath),
    ...partialMock,
  }))
}

// Assertion utilities
export const expectMockToBeCalled = <T extends (...args: any[]) => any>(
  mockFn: MockedFunction<T>
) => {
  expect(mockFn).toHaveBeenCalled()
}

export const expectMockToBeCalledWith = <T extends (...args: any[]) => any>(
  mockFn: MockedFunction<T>,
  ...args: Parameters<T>
) => {
  expect(mockFn).toHaveBeenCalledWith(...args)
}

export const expectMockToBeCalledTimes = <T extends (...args: any[]) => any>(
  mockFn: MockedFunction<T>,
  times: number
) => {
  expect(mockFn).toHaveBeenCalledTimes(times)
}

export const getMockCallCount = <T extends (...args: any[]) => any>(
  mockFn: MockedFunction<T>
): number => {
  return mockFn.mock.calls.length
}

export const getMockCalls = <T extends (...args: any[]) => any>(
  mockFn: MockedFunction<T>
): Parameters<T>[] => {
  return mockFn.mock.calls as Parameters<T>[]
}

export const getMockResults = <T extends (...args: any[]) => any>(
  mockFn: MockedFunction<T>
): ReturnType<T>[] => {
  return mockFn.mock.results.map((result) => result.value)
}

// Timer mocks for testing
export const mockTimers = () => {
  const originalSetTimeout = global.setTimeout
  const originalSetInterval = global.setInterval
  const originalClearTimeout = global.clearTimeout
  const originalClearInterval = global.clearInterval
  
  let timeouts: Map<number, { callback: () => void; delay: number }> = new Map()
  let intervals: Map<number, { callback: () => void; delay: number }> = new Map()
  let nextId = 1
  
  const mockSetTimeout = mock((callback: () => void, delay: number) => {
    const id = nextId++
    timeouts.set(id, { callback, delay })
    return id
  })
  
  const mockSetInterval = mock((callback: () => void, delay: number) => {
    const id = nextId++
    intervals.set(id, { callback, delay })
    return id
  })
  
  const mockClearTimeout = mock((id: number) => {
    timeouts.delete(id)
  })
  
  const mockClearInterval = mock((id: number) => {
    intervals.delete(id)
  })
  
  global.setTimeout = mockSetTimeout as any
  global.setInterval = mockSetInterval as any
  global.clearTimeout = mockClearTimeout as any
  global.clearInterval = mockClearInterval as any
  
  const advanceTimers = (ms: number) => {
    for (const [id, { callback, delay }] of timeouts.entries()) {
      if (delay <= ms) {
        callback()
        timeouts.delete(id)
      }
    }
  }
  
  const runOnlyPendingTimers = () => {
    for (const [id, { callback }] of timeouts.entries()) {
      callback()
      timeouts.delete(id)
    }
  }
  
  const restoreTimers = () => {
    global.setTimeout = originalSetTimeout
    global.setInterval = originalSetInterval
    global.clearTimeout = originalClearTimeout
    global.clearInterval = originalClearInterval
    timeouts.clear()
    intervals.clear()
  }
  
  return {
    advanceTimers,
    runOnlyPendingTimers,
    restoreTimers,
    mockSetTimeout,
    mockSetInterval,
    mockClearTimeout,
    mockClearInterval,
  }
}

// Export commonly used patterns
export const commonMocks = {
  fetch: createFetchMock,
  router: mockNextRouter,
  cookies: mockNextCookies,
  clipboard: mockNavigatorClipboard,
  localStorage: mockLocalStorage,
  timers: mockTimers,
}

// Helper to replace Vitest mocked() calls
export const asMocked = <T>(item: T): MockedObject<T> => {
  return item as MockedObject<T>
}

// Type-safe mock creation
export const createMock = <T>(): MockedObject<T> => {
  return {} as MockedObject<T>
}