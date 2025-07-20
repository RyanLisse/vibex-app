// AsyncLocalStorage compatibility layer
class BrowserAsyncLocalStorage {
  private store: any = null
  run(store: any, callback: () => any) {
    this.store = store
    return callback()
  }
  getStore() {
    return this.store
  }
}

// Use dynamic import pattern that's ESM-compatible
let AsyncLocalStorage: any = BrowserAsyncLocalStorage

if (typeof window === 'undefined' && typeof process !== 'undefined') {
  // Lazy load in Node.js environment
  import('async_hooks')
    .then((asyncHooks) => {
      AsyncLocalStorage = asyncHooks.AsyncLocalStorage
    })
    .catch(() => {
      // Keep using browser fallback if async_hooks is not available
    })
}
import { randomUUID } from 'crypto'
import type { NextRequest } from 'next/server'

export class CorrelationIdManager {
  private static instance: CorrelationIdManager
  private storage: any

  constructor() {
    // Initialize storage based on the current AsyncLocalStorage implementation
    if (typeof window === 'undefined' && typeof process !== 'undefined') {
      try {
        // In Node.js, AsyncLocalStorage will be the real one from async_hooks
        this.storage = new AsyncLocalStorage()
      } catch {
        // Fallback to browser implementation
        this.storage = new BrowserAsyncLocalStorage()
      }
    } else {
      // In browser, use the fallback
      this.storage = new BrowserAsyncLocalStorage()
    }
  }

  static getInstance(): CorrelationIdManager {
    if (!CorrelationIdManager.instance) {
      CorrelationIdManager.instance = new CorrelationIdManager()
    }
    return CorrelationIdManager.instance
  }

  generateId(): string {
    return randomUUID()
  }

  getCurrentId(): string | undefined {
    return this.storage.getStore()
  }

  withId<T>(id: string, fn: () => T): T {
    return this.storage.run(id, fn)
  }

  async withIdAsync<T>(id: string, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(id, fn)
  }

  extractFromRequest(req: NextRequest): string {
    const headerCorrelationId =
      req.headers.get('x-correlation-id') ||
      req.headers.get('x-request-id') ||
      req.headers.get('x-trace-id')

    if (headerCorrelationId) {
      return headerCorrelationId
    }

    return this.generateId()
  }

  injectIntoResponse(res: Response, correlationId: string): void {
    res.headers.set('x-correlation-id', correlationId)
  }
}
