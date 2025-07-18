import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  safeStreamCancel,
  safeWebSocketClose,
  createTimeoutPromise,
  withTimeout,
  safeAsync,
  debounce,
} from './stream-utils'

describe('stream-utils', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('safeStreamCancel', () => {
    it('should handle null stream', async () => {
      await safeStreamCancel(null)
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('should handle undefined stream', async () => {
      await safeStreamCancel(undefined)
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('should cancel an unlocked stream', async () => {
      const mockReader = {
        cancel: vi.fn().mockResolvedValue(undefined),
        releaseLock: vi.fn(),
      }
      const mockStream = {
        locked: false,
        getReader: vi.fn().mockReturnValue(mockReader),
      } as unknown as ReadableStream

      await safeStreamCancel(mockStream)

      expect(mockStream.getReader).toHaveBeenCalled()
      expect(mockReader.cancel).toHaveBeenCalled()
      expect(mockReader.releaseLock).toHaveBeenCalled()
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('should handle locked stream', async () => {
      const mockStream = {
        locked: true,
      } as unknown as ReadableStream

      await safeStreamCancel(mockStream)

      expect(console.warn).toHaveBeenCalledWith('Stream is locked, cannot cancel safely')
    })

    it('should handle cancel error', async () => {
      const mockError = new Error('Cancel failed')
      const mockReader = {
        cancel: vi.fn().mockRejectedValue(mockError),
        releaseLock: vi.fn(),
      }
      const mockStream = {
        locked: false,
        getReader: vi.fn().mockReturnValue(mockReader),
      } as unknown as ReadableStream

      await safeStreamCancel(mockStream)

      expect(mockReader.cancel).toHaveBeenCalled()
      expect(mockReader.releaseLock).toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith('Error cancelling stream reader:', mockError)
    })

    it('should handle releaseLock error', async () => {
      const mockError = new Error('Release lock failed')
      const mockReader = {
        cancel: vi.fn().mockResolvedValue(undefined),
        releaseLock: vi.fn().mockImplementation(() => {
          throw mockError
        }),
      }
      const mockStream = {
        locked: false,
        getReader: vi.fn().mockReturnValue(mockReader),
      } as unknown as ReadableStream

      await safeStreamCancel(mockStream)

      expect(mockReader.releaseLock).toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith('Error releasing stream reader lock:', mockError)
    })

    it('should handle getReader error', async () => {
      const mockError = new Error('Get reader failed')
      const mockStream = {
        locked: false,
        getReader: vi.fn().mockImplementation(() => {
          throw mockError
        }),
      } as unknown as ReadableStream

      await safeStreamCancel(mockStream)

      expect(console.warn).toHaveBeenCalledWith('Error in safe stream cancel:', mockError)
    })
  })

  describe('safeWebSocketClose', () => {
    it('should handle null WebSocket', () => {
      safeWebSocketClose(null)
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('should handle undefined WebSocket', () => {
      safeWebSocketClose(undefined)
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('should close open WebSocket', () => {
      const mockWs = {
        readyState: WebSocket.OPEN,
        close: vi.fn(),
      } as unknown as WebSocket

      safeWebSocketClose(mockWs)

      expect(mockWs.close).toHaveBeenCalledWith(1000, 'Normal closure')
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('should close connecting WebSocket', () => {
      const mockWs = {
        readyState: WebSocket.CONNECTING,
        close: vi.fn(),
      } as unknown as WebSocket

      safeWebSocketClose(mockWs)

      expect(mockWs.close).toHaveBeenCalledWith(1000, 'Normal closure')
    })

    it('should not close closed WebSocket', () => {
      const mockWs = {
        readyState: WebSocket.CLOSED,
        close: vi.fn(),
      } as unknown as WebSocket

      safeWebSocketClose(mockWs)

      expect(mockWs.close).not.toHaveBeenCalled()
    })

    it('should not close closing WebSocket', () => {
      const mockWs = {
        readyState: WebSocket.CLOSING,
        close: vi.fn(),
      } as unknown as WebSocket

      safeWebSocketClose(mockWs)

      expect(mockWs.close).not.toHaveBeenCalled()
    })

    it('should handle close error', () => {
      const mockError = new Error('Close failed')
      const mockWs = {
        readyState: WebSocket.OPEN,
        close: vi.fn().mockImplementation(() => {
          throw mockError
        }),
      } as unknown as WebSocket

      safeWebSocketClose(mockWs)

      expect(console.warn).toHaveBeenCalledWith('Error closing WebSocket:', mockError)
    })
  })

  describe('createTimeoutPromise', () => {
    it('should reject after timeout with default message', async () => {
      const promise = createTimeoutPromise(10)

      await expect(promise).rejects.toThrow('Operation timed out')
    })

    it('should reject after timeout with custom message', async () => {
      const promise = createTimeoutPromise(10, 'Custom timeout')

      await expect(promise).rejects.toThrow('Custom timeout')
    })

    it('should reject after specified time', async () => {
      const start = Date.now()
      const promise = createTimeoutPromise(50)

      try {
        await promise
      } catch (error) {
        const elapsed = Date.now() - start
        expect(elapsed).toBeGreaterThanOrEqual(50)
        expect(elapsed).toBeLessThan(100)
      }
    })
  })

  describe('withTimeout', () => {
    it('should resolve if promise completes before timeout', async () => {
      const promise = Promise.resolve('success')
      const result = await withTimeout(promise, 100)

      expect(result).toBe('success')
    })

    it('should reject if promise takes longer than timeout', async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 100))

      await expect(withTimeout(promise, 10)).rejects.toThrow('Operation timed out')
    })

    it('should use custom timeout message', async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 100))

      await expect(withTimeout(promise, 10, 'Custom timeout')).rejects.toThrow('Custom timeout')
    })

    it('should handle rejected promises', async () => {
      const promise = Promise.reject(new Error('Original error'))

      await expect(withTimeout(promise, 100)).rejects.toThrow('Original error')
    })

    it('should win race when promise completes first', async () => {
      const promise = Promise.resolve('fast')
      const result = await withTimeout(promise, 1000)

      expect(result).toBe('fast')
    })
  })

  describe('safeAsync', () => {
    it('should return result on success', async () => {
      const fn = async () => 'success'
      const result = await safeAsync(fn)

      expect(result).toBe('success')
    })

    it('should return undefined on error without fallback', async () => {
      const fn = async () => {
        throw new Error('Test error')
      }
      const result = await safeAsync(fn)

      expect(result).toBeUndefined()
    })

    it('should return fallback on error', async () => {
      const fn = async () => {
        throw new Error('Test error')
      }
      const result = await safeAsync(fn, 'fallback')

      expect(result).toBe('fallback')
    })

    it('should log error with custom message', async () => {
      const error = new Error('Test error')
      const fn = async () => {
        throw error
      }
      
      await safeAsync(fn, undefined, 'Custom error message')

      expect(console.warn).toHaveBeenCalledWith('Custom error message', error)
    })

    it('should not log error without custom message', async () => {
      const fn = async () => {
        throw new Error('Test error')
      }
      
      await safeAsync(fn)

      expect(console.warn).not.toHaveBeenCalled()
    })

    it('should handle sync errors in async function', async () => {
      const fn = async () => {
        throw new Error('Sync error in async')
      }
      const result = await safeAsync(fn, 'fallback')

      expect(result).toBe('fallback')
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should debounce function calls', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn('call1')
      debouncedFn('call2')
      debouncedFn('call3')

      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('call3')
    })

    it('should handle single call', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn('single')

      vi.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('single')
    })

    it('should reset timer on new calls', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn('first')
      vi.advanceTimersByTime(50)
      
      debouncedFn('second')
      vi.advanceTimersByTime(50)
      
      expect(fn).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(50)
      
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('second')
    })

    it('should handle multiple arguments', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn('arg1', 'arg2', 42)

      vi.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 42)
    })

    it('should allow multiple executions after wait time', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn('first')
      vi.advanceTimersByTime(100)
      
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('first')

      debouncedFn('second')
      vi.advanceTimersByTime(100)
      
      expect(fn).toHaveBeenCalledTimes(2)
      expect(fn).toHaveBeenCalledWith('second')
    })

    it('should handle zero wait time', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 0)

      debouncedFn('immediate')

      vi.advanceTimersByTime(0)

      expect(fn).toHaveBeenCalledWith('immediate')
    })
  })
})