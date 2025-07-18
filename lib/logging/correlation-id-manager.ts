import { AsyncLocalStorage } from 'async_hooks'
import { randomUUID } from 'crypto'
import { NextRequest } from 'next/server'

export class CorrelationIdManager {
  private static instance: CorrelationIdManager
  private storage = new AsyncLocalStorage<string>()

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
