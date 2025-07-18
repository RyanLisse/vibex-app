import { afterEach, beforeEach, vi } from 'vitest'

/**
 * Comprehensive test cleanup utilities
 */

// Track all active timers and intervals
const activeTimers = new Set<NodeJS.Timeout>()
const activeIntervals = new Set<NodeJS.Timeout>()

// Override global timer functions to track them
const originalSetTimeout = global.setTimeout
const originalSetInterval = global.setInterval
const originalClearTimeout = global.clearTimeout
const originalClearInterval = global.clearInterval

export function setupTestCleanup() {
  beforeEach(() => {
    // Clear sets
    activeTimers.clear()
    activeIntervals.clear()

    // Wrap timer functions to track them
    global.setTimeout = ((callback: any, ms?: number, ...args: any[]) => {
      const timer = originalSetTimeout(callback, ms, ...args)
      activeTimers.add(timer)
      return timer
    }) as any

    global.setInterval = ((callback: any, ms?: number, ...args: any[]) => {
      const interval = originalSetInterval(callback, ms, ...args)
      activeIntervals.add(interval)
      return interval
    }) as any

    global.clearTimeout = ((timer: NodeJS.Timeout) => {
      activeTimers.delete(timer)
      return originalClearTimeout(timer)
    }) as any

    global.clearInterval = ((interval: NodeJS.Timeout) => {
      activeIntervals.delete(interval)
      return originalClearInterval(interval)
    }) as any
  })

  afterEach(() => {
    // Clear all active timers
    activeTimers.forEach((timer) => originalClearTimeout(timer))
    activeIntervals.forEach((interval) => originalClearInterval(interval))

    // Clear sets
    activeTimers.clear()
    activeIntervals.clear()

    // Restore original functions
    global.setTimeout = originalSetTimeout
    global.setInterval = originalSetInterval
    global.clearTimeout = originalClearTimeout
    global.clearInterval = originalClearInterval

    // Additional cleanup
    vi.clearAllTimers()
    vi.clearAllMocks()
  })
}

/**
 * Wait for all pending promises to resolve
 */
export async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve))
}

/**
 * Clean up all event listeners on a target
 */
export function removeAllListeners(target: EventTarget) {
  const proto = Object.getPrototypeOf(target)
  const eventNames = Object.getOwnPropertyNames(proto)
    .filter((name) => name.startsWith('on'))
    .map((name) => name.slice(2))

  eventNames.forEach((eventName) => {
    // Remove all listeners for this event
    const listeners = (target as any).listeners?.(eventName) || []
    listeners.forEach((listener: any) => {
      target.removeEventListener(eventName, listener)
    })
  })
}

/**
 * Force garbage collection if available
 */
export function forceGC() {
  if (global.gc) {
    global.gc()
  }
}

/**
 * Clean up DOM completely
 */
export function cleanupDOM() {
  document.body.innerHTML = ''
  document.head.innerHTML = ''

  // Remove all event listeners from window and document
  removeAllListeners(window)
  removeAllListeners(document)
}

/**
 * Reset all module mocks
 */
export function resetModules() {
  vi.resetModules()
  vi.clearAllMocks()
  vi.restoreAllMocks()
}
