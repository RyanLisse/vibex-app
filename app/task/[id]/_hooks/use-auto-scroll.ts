import { useEffect, useRef } from 'react'

export function useAutoScroll<T extends HTMLElement>(dependencies: unknown[]) {
  const scrollAreaRef = useRef<T>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth',
        })
      }
    }
  }, dependencies)

  return scrollAreaRef
}