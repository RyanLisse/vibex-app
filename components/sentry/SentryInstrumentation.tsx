'use client'

import * as Sentry from '@sentry/nextjs'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Component to add Sentry instrumentation to UI interactions
 */
export function SentryInstrumentation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Track page views
    Sentry.addBreadcrumb({
      message: `Page View: ${pathname}`,
      category: 'navigation',
      level: 'info',
      data: {
        pathname,
        search: searchParams.toString(),
      },
    })

    // Set transaction name
    const transaction = Sentry.getCurrentScope().getTransaction()
    if (transaction) {
      transaction.setName(`${pathname}`)
    }
  }, [pathname, searchParams])

  return <>{children}</>
}

/**
 * HOC to instrument a component with Sentry performance monitoring
 */
export function withSentryInstrumentation<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function InstrumentedComponent(props: P) {
    useEffect(() => {
      Sentry.addBreadcrumb({
        message: `Component Mount: ${componentName}`,
        category: 'ui',
        level: 'debug',
      })

      return () => {
        Sentry.addBreadcrumb({
          message: `Component Unmount: ${componentName}`,
          category: 'ui',
          level: 'debug',
        })
      }
    }, [])

    return <Component {...props} />
  }
}

/**
 * Hook to track user interactions
 */
export function useSentryAction(actionName: string) {
  return (callback: (...args: any[]) => void | Promise<void>) => {
    return Sentry.startSpan(
      {
        op: 'ui.action',
        name: actionName,
      },
      async (span) => {
        try {
          Sentry.addBreadcrumb({
            message: `User Action: ${actionName}`,
            category: 'ui.action',
            level: 'info',
          })

          await callback()

          span?.setStatus('ok')
        } catch (error) {
          span?.setStatus('internal_error')
          Sentry.captureException(error, {
            tags: {
              action: actionName,
            },
          })
          throw error
        }
      }
    )
  }
}
