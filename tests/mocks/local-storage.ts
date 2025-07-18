// storage-mocks.ts
// ---------------------------------------------------------------------------
// Unified mocks for localStorage, sessionStorage and IndexedDB in Vitest
// ---------------------------------------------------------------------------

import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// - Helpers
// ---------------------------------------------------------------------------

/** Create a standard MockIDBRequest and resolve it in the next micro‑task. */
const createRequest = <T>(result: T): MockIDBRequest => {
  const req: MockIDBRequest = {
    result,
    error: null,
    readyState: 'pending',
    onsuccess: null,
    onerror: null,
  }
  // Faster than setTimeout 0 and keeps JS semantics (≈ `Promise.resolve().then`)
  queueMicrotask(() => {
    req.readyState = 'done'
    req.onsuccess?.(new Event('success'))
  })
  return req
}

/** Wrap common `add/put` logic for an object‑store Map. */
const op =
  (db: Map<string, Map<unknown, unknown>>, storeName: string, opts?: IDBObjectStoreParameters) =>
  (value: unknown, key?: unknown) => {
    const store = db.get(storeName)!
    let finalKey = key

    if (finalKey === undefined) {
      if (opts?.keyPath && typeof opts.keyPath === 'string' && value && typeof value === 'object') {
        finalKey = (value as Record<string, unknown>)[opts.keyPath]
      } else {
        finalKey = crypto.randomUUID()
      }
    }
    store.set(finalKey, value)
    return createRequest(finalKey)
  }

/** Build a convenient facade around a MockStorage instance. */
const buildStorageFacade = (mock: MockStorage) => ({
  get: (k: string) => mock.getItem(k),
  set: (k: string, v: string) => mock.setItem(k, v),
  remove: (k: string) => mock.removeItem(k),
  clear: () => mock.clear(),
  getAll: () => mock.getAll(),
  keys: () => mock.keys(),
  size: () => mock.size(),
  has: (k: string) => mock.has(k),
})

// ---------------------------------------------------------------------------
// - Mock Storage (local/session)
// ---------------------------------------------------------------------------

class MockStorage implements Storage {
  #store = new Map<string, string>()
  #listeners = new Set<(e: StorageEvent) => void>()

  // Storage API ----------------------------------------------------------------
  get length() {
    return this.#store.size
  }
  clear() {
    this.#store.clear()
  }
  getItem(k: string) {
    return this.#store.get(k) ?? null
  }
  key(i: number) {
    return [...this.#store.keys()][i] ?? null
  }
  removeItem(k: string) {
    this.#store.delete(k)
  }
  setItem(k: string, v: string) {
    this.#store.set(k, v)
  }

  // Extras for tests -----------------------------------------------------------
  getAll() {
    return Object.fromEntries(this.#store)
  }
  reset() {
    this.#store.clear()
  }
  size() {
    return this.#store.size
  }
  keys() {
    return [...this.#store.keys()]
  }
  values() {
    return [...this.#store.values()]
  }
  has(k: string) {
    return this.#store.has(k)
  }

  // Event simulation -----------------------------------------------------------
  addEventListener(type: 'storage', fn: (e: StorageEvent) => void) {
    if (type === 'storage') this.#listeners.add(fn)
  }
  removeEventListener(type: 'storage', fn: (e: StorageEvent) => void) {
    if (type === 'storage') this.#listeners.delete(fn)
  }
  dispatchStorageEvent(key: string, newValue: string | null, oldValue: string | null) {
    const evt = new StorageEvent('storage', {
      key,
      newValue,
      oldValue,
      url: global.location?.href || '',
      storageArea: this,
    })
    this.#listeners.forEach((l) => l(evt))
  }
}

const mockLocalStorage = new MockStorage()
const mockSessionStorage = new MockStorage()

// ---------------------------------------------------------------------------
// - Mock IndexedDB
// ---------------------------------------------------------------------------

type StoreMap = Map<unknown, unknown>
const idbData = new Map<string /*db*/, Map<string /*store*/, StoreMap>>()

export const mockIndexedDB = {
  // open ----------------------------------------------------------------------
  open: vi.fn().mockImplementation((name: string, v?: number) => {
    return createRequest(
      (() => {
        if (!idbData.has(name)) idbData.set(name, new Map())
        const dbMap = idbData.get(name)!

        const database: MockIDBDatabase = {
          name,
          version: v ?? 1,
          objectStoreNames: [...dbMap.keys()],
          close: vi.fn(),
          createObjectStore: vi
            .fn()
            .mockImplementation((storeName: string, opts?: IDBObjectStoreParameters) => {
              if (!dbMap.has(storeName)) dbMap.set(storeName, new Map())

              const objectStore: MockIDBObjectStore = {
                name: storeName,
                keyPath: opts?.keyPath ?? null,
                indexNames: [],
                add: op(dbMap, storeName, opts),
                put: op(dbMap, storeName, opts),
                get: vi.fn((k) => createRequest(dbMap.get(storeName)!.get(k) ?? null)),
                getAll: vi.fn(() => createRequest([...dbMap.get(storeName)!.values()])),
                delete: vi.fn((k) => {
                  dbMap.get(storeName)!.delete(k)
                  return createRequest(undefined)
                }),
                clear: vi.fn(() => {
                  dbMap.get(storeName)!.clear()
                  return createRequest(undefined)
                }),
                count: vi.fn(() => createRequest(dbMap.get(storeName)!.size)),
                createIndex: vi.fn(),
                deleteIndex: vi.fn(),
                index: vi.fn(),
              }
              return objectStore
            }),
          deleteObjectStore: vi.fn(),
          transaction: vi
            .fn()
            .mockImplementation(
              (stores: string | string[], mode: IDBTransactionMode = 'readonly') => {
                const names = Array.isArray(stores) ? stores : [stores]
                return {
                  mode,
                  objectStoreNames: names,
                  error: null,
                  abort: vi.fn(),
                  objectStore: vi.fn((sn: string) => {
                    if (!dbMap.has(sn)) throw new Error(`Store "${sn}" not found`)
                    const s = dbMap.get(sn)!
                    return {
                      add: op(dbMap, sn),
                      put: op(dbMap, sn),
                      get: vi.fn((k) => createRequest(s.get(k) ?? null)),
                      getAll: vi.fn(() => createRequest([...s.values()])),
                      delete: vi.fn((k) => {
                        s.delete(k)
                        return createRequest(undefined)
                      }),
                      clear: vi.fn(() => {
                        s.clear()
                        return createRequest(undefined)
                      }),
                      count: vi.fn(() => createRequest(s.size)),
                      index: vi.fn(),
                    }
                  }),
                } as MockIDBTransaction
              }
            ),
        }
        return database
      })()
    )
  }),

  // deleteDatabase ------------------------------------------------------------
  deleteDatabase: vi.fn().mockImplementation((name: string) => {
    idbData.delete(name)
    return createRequest(undefined)
  }),

  // cmp -----------------------------------------------------------------------
  cmp: vi.fn((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
}

// ---------------------------------------------------------------------------
// - Public helpers
// ---------------------------------------------------------------------------

export const storageUtils = {
  localStorage: buildStorageFacade(mockLocalStorage),
  sessionStorage: buildStorageFacade(mockSessionStorage),

  indexedDB: {
    reset: () => idbData.clear(),
    getDatabases: () => [...idbData.keys()],
    getDatabase: (n: string) => idbData.get(n),
    hasDatabase: (n: string) => idbData.has(n),
    clearDatabase: (n: string) => idbData.get(n)?.clear(),
  },

  resetAll() {
    mockLocalStorage.reset()
    mockSessionStorage.reset()
    idbData.clear()
  },

  simulateQuotaExceeded() {
    const err = Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' })
    mockLocalStorage.setItem = vi.fn(() => {
      throw err
    })
    mockSessionStorage.setItem = vi.fn(() => {
      throw err
    })
  },

  restoreNormalBehavior() {
    mockLocalStorage.setItem = MockStorage.prototype.setItem.bind(mockLocalStorage)
    mockSessionStorage.setItem = MockStorage.prototype.setItem.bind(mockSessionStorage)
  },
}

// ---------------------------------------------------------------------------
// - Environment setup / teardown
// ---------------------------------------------------------------------------

export const setupStorageMocks = () => {
  Object.assign(global, {
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage,
    indexedDB: mockIndexedDB,
    IDBKeyRange: {
      only: vi.fn(),
      lowerBound: vi.fn(),
      upperBound: vi.fn(),
      bound: vi.fn(),
    },
  })
  storageUtils.resetAll()
}

export const cleanupStorageMocks = () => {
  storageUtils.resetAll()
  storageUtils.restoreNormalBehavior()
  vi.clearAllMocks()
}

// ---------------------------------------------------------------------------
// - Extra test helpers
// ---------------------------------------------------------------------------

export const storageTestHelpers = {
  expectLocalStorageUsed: (k: string, v?: string) =>
    v ? expect(mockLocalStorage.getItem(k)).toBe(v) : expect(mockLocalStorage.has(k)).toBe(true),

  expectSessionStorageUsed: (k: string, v?: string) =>
    v
      ? expect(mockSessionStorage.getItem(k)).toBe(v)
      : expect(mockSessionStorage.has(k)).toBe(true),

  expectIndexedDBAccessed: (db: string) =>
    expect(mockIndexedDB.open).toHaveBeenCalledWith(db, expect.any(Number)),

  waitForIndexedDB: (t = 50) => new Promise((r) => setTimeout(r, t)),

  simulateStorageEvent: (k: string, newV: string | null, oldV: string | null) =>
    mockLocalStorage.dispatchStorageEvent(k, newV, oldV),
}

// ---------------------------------------------------------------------------
// - Type definitions (unchanged public surface)
// ---------------------------------------------------------------------------

export interface MockIDBRequest {
  result: unknown
  error: Error | null
  readyState: 'pending' | 'done'
  onsuccess: ((e: Event) => void) | null
  onerror: ((e: Event) => void) | null
}

export interface MockIDBIndex {
  name: string
  keyPath: string | string[]
  unique: boolean
  get: ReturnType<typeof vi.fn>
  getAll: ReturnType<typeof vi.fn>
  count: ReturnType<typeof vi.fn>
}

export interface MockIDBObjectStore {
  name: string
  keyPath: string | string[] | null
  indexNames: string[]
  add: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  getAll: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
  count: ReturnType<typeof vi.fn>
  createIndex: ReturnType<typeof vi.fn>
  deleteIndex: ReturnType<typeof vi.fn>
  index: ReturnType<typeof vi.fn>
}

export interface MockIDBTransaction {
  mode: IDBTransactionMode
  objectStoreNames: string[]
  error: Error | null
  abort: ReturnType<typeof vi.fn>
  objectStore: ReturnType<typeof vi.fn>
}

export interface MockIDBDatabase {
  name: string
  version: number
  objectStoreNames: string[]
  close: ReturnType<typeof vi.fn>
  createObjectStore: ReturnType<typeof vi.fn>
  deleteObjectStore: ReturnType<typeof vi.fn>
  transaction: ReturnType<typeof vi.fn>
}
