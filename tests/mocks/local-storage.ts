// Local Storage and Session Storage Mocking Utilities
// Comprehensive mocking for browser storage APIs

import { vi } from 'vitest'

// Mock storage implementation
class MockStorage implements Storage {
  private store: Map<string, string> = new Map()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.get(key) || null
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys())
    return keys[index] || null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  // Additional utility methods for testing
  getAll(): Record<string, string> {
    return Object.fromEntries(this.store)
  }

  reset(): void {
    this.store.clear()
  }

  size(): number {
    return this.store.size
  }

  keys(): string[] {
    return Array.from(this.store.keys())
  }

  values(): string[] {
    return Array.from(this.store.values())
  }

  has(key: string): boolean {
    return this.store.has(key)
  }

  // Simulate storage events
  private listeners: Set<(event: StorageEvent) => void> = new Set()

  addEventListener(type: 'storage', listener: (event: StorageEvent) => void): void {
    if (type === 'storage') {
      this.listeners.add(listener)
    }
  }

  removeEventListener(type: 'storage', listener: (event: StorageEvent) => void): void {
    if (type === 'storage') {
      this.listeners.delete(listener)
    }
  }

  dispatchStorageEvent(key: string, newValue: string | null, oldValue: string | null): void {
    const event = new StorageEvent('storage', {
      key,
      newValue,
      oldValue,
      url: global.location?.href || 'http://localhost',
      storageArea: this as Storage,
    })

    this.listeners.forEach((listener) => listener(event))
  }
}

// Create mock storage instances
const mockLocalStorage = new MockStorage()
const mockSessionStorage = new MockStorage()

// Mock IndexedDB interfaces
export interface MockIDBDatabase {
  name: string
  version: number
  objectStoreNames: string[]
  close: vi.MockedFunction<() => void>
  createObjectStore: vi.MockedFunction<
    (name: string, options?: IDBObjectStoreParameters) => MockIDBObjectStore
  >
  deleteObjectStore: vi.MockedFunction<(name: string) => void>
  transaction: vi.MockedFunction<
    (storeNames: string | string[], mode?: IDBTransactionMode) => MockIDBTransaction
  >
}

export interface MockIDBObjectStore {
  name: string
  keyPath: string | string[] | null
  indexNames: string[]
  add: vi.MockedFunction<(value: any, key?: any) => MockIDBRequest>
  put: vi.MockedFunction<(value: any, key?: any) => MockIDBRequest>
  get: vi.MockedFunction<(key: any) => MockIDBRequest>
  getAll: vi.MockedFunction<(query?: any, count?: number) => MockIDBRequest>
  delete: vi.MockedFunction<(key: any) => MockIDBRequest>
  clear: vi.MockedFunction<() => MockIDBRequest>
  count: vi.MockedFunction<(query?: any) => MockIDBRequest>
  createIndex: vi.MockedFunction<
    (name: string, keyPath: string | string[], options?: IDBIndexParameters) => MockIDBIndex
  >
  deleteIndex: vi.MockedFunction<(name: string) => void>
  index: vi.MockedFunction<(name: string) => MockIDBIndex>
}

export interface MockIDBIndex {
  name: string
  keyPath: string | string[]
  unique: boolean
  get: vi.MockedFunction<(key: any) => MockIDBRequest>
  getAll: vi.MockedFunction<(query?: any, count?: number) => MockIDBRequest>
  count: vi.MockedFunction<(query?: any) => MockIDBRequest>
}

export interface MockIDBTransaction {
  mode: IDBTransactionMode
  objectStoreNames: string[]
  error: Error | null
  abort: vi.MockedFunction<() => void>
  objectStore: vi.MockedFunction<(name: string) => MockIDBObjectStore>
}

export interface MockIDBRequest {
  result: any
  error: Error | null
  readyState: 'pending' | 'done'
  onsuccess: ((event: Event) => void) | null
  onerror: ((event: Event) => void) | null
}

// Mock IndexedDB data store
const mockIDBData: Map<string, Map<string, Map<any, any>>> = new Map()

// Helper function to create store operations (add/put)
const createStoreOperation = (
  store: Map<string, Map<any, any>>,
  storeName: string,
  options?: IDBObjectStoreParameters
) => {
  return vi.fn().mockImplementation((value: any, key?: any) => {
    const storeData = store.get(storeName)!
    const finalKey = key || (options?.keyPath ? value[options.keyPath as string] : Math.random())
    storeData.set(finalKey, value)

    const req: MockIDBRequest = {
      result: finalKey,
      error: null,
      readyState: 'done',
      onsuccess: null,
      onerror: null,
    }

    setTimeout(() => req.onsuccess?.(new Event('success')), 0)
    return req
  })
}

// Mock IndexedDB implementation
export const mockIndexedDB = {
  open: vi.fn().mockImplementation((name: string, version?: number) => {
    const request: MockIDBRequest = {
      result: null,
      error: null,
      readyState: 'pending',
      onsuccess: null,
      onerror: null,
    }

    // Simulate async operation
    setTimeout(() => {
      if (!mockIDBData.has(name)) {
        mockIDBData.set(name, new Map())
      }

      const database: MockIDBDatabase = {
        name,
        version: version || 1,
        objectStoreNames: Array.from(mockIDBData.get(name)!.keys()),
        close: vi.fn(),
        createObjectStore: vi
          .fn()
          .mockImplementation((storeName: string, options?: IDBObjectStoreParameters) => {
            const store = mockIDBData.get(name)!
            if (!store.has(storeName)) {
              store.set(storeName, new Map())
            }

            const objectStore: MockIDBObjectStore = {
              name: storeName,
              keyPath: options?.keyPath || null,
              indexNames: [],
              add: createStoreOperation(store, storeName, options),
              put: createStoreOperation(store, storeName, options),
              get: vi.fn().mockImplementation((key: any) => {
                const storeData = store.get(storeName)!
                const value = storeData.get(key)

                const req: MockIDBRequest = {
                  result: value || undefined,
                  error: null,
                  readyState: 'done',
                  onsuccess: null,
                  onerror: null,
                }

                setTimeout(() => req.onsuccess?.(new Event('success')), 0)
                return req
              }),
              getAll: vi.fn().mockImplementation((query?: any, count?: number) => {
                const storeData = store.get(storeName)!
                const values = Array.from(storeData.values())

                const req: MockIDBRequest = {
                  result: count ? values.slice(0, count) : values,
                  error: null,
                  readyState: 'done',
                  onsuccess: null,
                  onerror: null,
                }

                setTimeout(() => req.onsuccess?.(new Event('success')), 0)
                return req
              }),
              delete: vi.fn().mockImplementation((key: any) => {
                const storeData = store.get(storeName)!
                storeData.delete(key)

                const req: MockIDBRequest = {
                  result: undefined,
                  error: null,
                  readyState: 'done',
                  onsuccess: null,
                  onerror: null,
                }

                setTimeout(() => req.onsuccess?.(new Event('success')), 0)
                return req
              }),
              clear: vi.fn().mockImplementation(() => {
                const storeData = store.get(storeName)!
                storeData.clear()

                const req: MockIDBRequest = {
                  result: undefined,
                  error: null,
                  readyState: 'done',
                  onsuccess: null,
                  onerror: null,
                }

                setTimeout(() => req.onsuccess?.(new Event('success')), 0)
                return req
              }),
              count: vi.fn().mockImplementation((query?: any) => {
                const storeData = store.get(storeName)!

                const req: MockIDBRequest = {
                  result: storeData.size,
                  error: null,
                  readyState: 'done',
                  onsuccess: null,
                  onerror: null,
                }

                setTimeout(() => req.onsuccess?.(new Event('success')), 0)
                return req
              }),
              createIndex: vi.fn(),
              deleteIndex: vi.fn(),
              index: vi.fn(),
            }

            return objectStore
          }),
        deleteObjectStore: vi.fn(),
        transaction: vi
          .fn()
          .mockImplementation((storeNames: string | string[], mode?: IDBTransactionMode) => {
            const names = Array.isArray(storeNames) ? storeNames : [storeNames]

            const transaction: MockIDBTransaction = {
              mode: mode || 'readonly',
              objectStoreNames: names,
              error: null,
              abort: vi.fn(),
              objectStore: vi.fn().mockImplementation((name: string) => {
                return database.createObjectStore(name)
              }),
            }

            return transaction
          }),
      }

      request.result = database
      request.readyState = 'done'
      request.onsuccess?.(new Event('success'))
    }, 0)

    return request
  }),

  deleteDatabase: vi.fn().mockImplementation((name: string) => {
    const request: MockIDBRequest = {
      result: undefined,
      error: null,
      readyState: 'pending',
      onsuccess: null,
      onerror: null,
    }

    setTimeout(() => {
      mockIDBData.delete(name)
      request.readyState = 'done'
      request.onsuccess?.(new Event('success'))
    }, 0)

    return request
  }),

  cmp: vi.fn().mockImplementation((a: any, b: any) => {
    if (a < b) return -1
    if (a > b) return 1
    return 0
  }),
}

// Storage utility functions
export const storageUtils = {
  // localStorage utilities
  localStorage: {
    get: (key: string) => mockLocalStorage.getItem(key),
    set: (key: string, value: string) => mockLocalStorage.setItem(key, value),
    remove: (key: string) => mockLocalStorage.removeItem(key),
    clear: () => mockLocalStorage.clear(),
    getAll: () => mockLocalStorage.getAll(),
    keys: () => mockLocalStorage.keys(),
    size: () => mockLocalStorage.size(),
    has: (key: string) => mockLocalStorage.has(key),
  },

  // sessionStorage utilities
  sessionStorage: {
    get: (key: string) => mockSessionStorage.getItem(key),
    set: (key: string, value: string) => mockSessionStorage.setItem(key, value),
    remove: (key: string) => mockSessionStorage.removeItem(key),
    clear: () => mockSessionStorage.clear(),
    getAll: () => mockSessionStorage.getAll(),
    keys: () => mockSessionStorage.keys(),
    size: () => mockSessionStorage.size(),
    has: (key: string) => mockSessionStorage.has(key),
  },

  // IndexedDB utilities
  indexedDB: {
    reset: () => {
      mockIDBData.clear()
    },
    getDatabases: () => Array.from(mockIDBData.keys()),
    getDatabase: (name: string) => mockIDBData.get(name),
    hasDatabase: (name: string) => mockIDBData.has(name),
    clearDatabase: (name: string) => {
      const db = mockIDBData.get(name)
      if (db) {
        db.clear()
      }
    },
  },

  // Reset all storage
  resetAll: () => {
    mockLocalStorage.reset()
    mockSessionStorage.reset()
    mockIDBData.clear()
  },

  // Simulate storage quota exceeded
  simulateQuotaExceeded: () => {
    const error = new Error('QuotaExceededError')
    error.name = 'QuotaExceededError'

    mockLocalStorage.setItem = vi.fn().mockImplementation(() => {
      throw error
    })

    mockSessionStorage.setItem = vi.fn().mockImplementation(() => {
      throw error
    })
  },

  // Restore normal storage behavior
  restoreNormalBehavior: () => {
    mockLocalStorage.setItem = MockStorage.prototype.setItem.bind(mockLocalStorage)
    mockSessionStorage.setItem = MockStorage.prototype.setItem.bind(mockSessionStorage)
  },
}

// Setup function to apply storage mocks
export const setupStorageMocks = () => {
  // Mock localStorage
  Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  })

  // Mock sessionStorage
  Object.defineProperty(global, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true,
  })

  // Mock IndexedDB
  Object.defineProperty(global, 'indexedDB', {
    value: mockIndexedDB,
    writable: true,
  })

  // Mock IDBKeyRange
  Object.defineProperty(global, 'IDBKeyRange', {
    value: {
      only: vi.fn(),
      lowerBound: vi.fn(),
      upperBound: vi.fn(),
      bound: vi.fn(),
    },
    writable: true,
  })
}

// Test helpers
export const storageTestHelpers = {
  // Assert localStorage was used
  expectLocalStorageUsed: (key: string, value?: string) => {
    if (value) {
      expect(mockLocalStorage.getItem(key)).toBe(value)
    } else {
      expect(mockLocalStorage.has(key)).toBe(true)
    }
  },

  // Assert sessionStorage was used
  expectSessionStorageUsed: (key: string, value?: string) => {
    if (value) {
      expect(mockSessionStorage.getItem(key)).toBe(value)
    } else {
      expect(mockSessionStorage.has(key)).toBe(true)
    }
  },

  // Assert IndexedDB was accessed
  expectIndexedDBAccessed: (dbName: string) => {
    expect(mockIndexedDB.open).toHaveBeenCalledWith(dbName, expect.any(Number))
  },

  // Wait for IndexedDB operations
  waitForIndexedDB: async (timeout = 100) => {
    return new Promise((resolve) => setTimeout(resolve, timeout))
  },

  // Simulate storage events
  simulateStorageEvent: (key: string, newValue: string | null, oldValue: string | null) => {
    mockLocalStorage.dispatchStorageEvent(key, newValue, oldValue)
  },
}

// Export setup function for easy integration
export const setupLocalStorageMocks = () => {
  setupStorageMocks()
  storageUtils.resetAll()
}

// Cleanup function
export const cleanupStorageMocks = () => {
  storageUtils.resetAll()
  storageUtils.restoreNormalBehavior()
  vi.clearAllMocks()
}
