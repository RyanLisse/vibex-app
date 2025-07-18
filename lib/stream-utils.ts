/**
 * Utility functions for safe stream handling and cleanup
 */

/**
 * Safely cancels a ReadableStream without throwing errors
 */
export async function safeStreamCancel(stream: ReadableStream | null | undefined): Promise<void> {
  if (!stream) {
    return
  }

  try {
    // Check if stream is already locked or cancelled
    if (stream.locked) {
      return
    }

    // Get a reader to check stream state
    const reader = stream.getReader()

    try {
      // Try to cancel the stream
      await reader.cancel()
    } catch (_error) {
    } finally {
      // Always release the reader
      try {
        reader.releaseLock()
      } catch (_error) {}
    }
  } catch (_error) {}
}

/**
 * Safely closes a WebSocket connection
 */
export function safeWebSocketClose(ws: WebSocket | null | undefined): void {
  if (!ws) {
    return
  }

  try {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(1000, 'Normal closure')
    }
  } catch (_error) {}
}

/**
 * Creates a timeout promise that rejects after specified milliseconds
 */
export function createTimeoutPromise(ms: number, message = 'Operation timed out'): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms)
  })
}

/**
 * Wraps a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  return Promise.race([promise, createTimeoutPromise(timeoutMs, timeoutMessage)])
}

/**
 * Safely executes an async function with error handling
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback?: T,
  errorMessage?: string
): Promise<T | undefined> {
  try {
    return await fn()
  } catch (_error) {
    if (errorMessage) {
    }
    return fallback
  }
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}
