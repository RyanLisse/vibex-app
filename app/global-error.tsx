'use client'

import * as Sentry from '@sentry/nextjs'
import type { ErrorInfo } from 'react'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <h1 className="mb-4 font-bold text-4xl">Something went wrong!</h1>
          <p className="mb-8 text-gray-600">
            An unexpected error occurred. We've been notified and are working on a fix.
          </p>
          <div className="space-x-4">
            <button
              className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
              onClick={() => reset()}
            >
              Try again
            </button>
            <button
              className="rounded bg-gray-200 px-4 py-2 text-gray-800 transition-colors hover:bg-gray-300"
              onClick={() => (window.location.href = '/')}
            >
              Go home
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-8 max-w-2xl text-left">
              <summary className="cursor-pointer text-gray-500 text-sm">Error details</summary>
              <pre className="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  )
}
