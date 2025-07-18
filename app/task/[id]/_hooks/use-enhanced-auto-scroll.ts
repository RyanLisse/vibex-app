import { useCallback, useEffect, useRef } from 'react'

interface UseEnhancedAutoScrollOptions {
  smooth?: boolean
  threshold?: number
  debounceMs?: number
}

/**
 * Enhanced auto-scroll hook with improved performance and UX
 * - Debounced scrolling to prevent excessive scroll events
 * - Threshold-based scrolling (only scroll if near bottom)
 * - Smooth scrolling option
 * - Better performance with RAF optimization
 */
export function useEnhancedAutoScroll<T extends HTMLElement>(
  dependencies: unknown[],
  options: UseEnhancedAutoScrollOptions = {}
) {
  const { smooth = true, threshold = 100, debounceMs = 50 } = options

  const scrollAreaRef = useRef<T>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const rafRef = useRef<number>()

  const scrollToBottom = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      const scrollArea = scrollAreaRef.current
      if (!scrollArea) {
        return
      }

      const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
      if (!viewport) {
        return
      }

      const { scrollTop, scrollHeight, clientHeight } = viewport
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      // Only auto-scroll if user is near the bottom
      if (distanceFromBottom <= threshold) {
        viewport.scrollTo({
          top: scrollHeight,
          behavior: smooth ? 'smooth' : 'auto',
        })
      }
    })
  }, [smooth, threshold])

  const debouncedScrollToBottom = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(scrollToBottom, debounceMs)
  }, [scrollToBottom, debounceMs])

  useEffect(() => {
    debouncedScrollToBottom()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return scrollAreaRef
}
