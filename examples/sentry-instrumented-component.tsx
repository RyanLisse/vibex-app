'use client'

import * as Sentry from '@sentry/nextjs'
import { useState } from 'react'
import {
  useSentryAction,
  withSentryInstrumentation,
} from '@/components/sentry/SentryInstrumentation'
import { enhancedObservability } from '@/lib/observability/enhanced'

interface ExampleComponentProps {
  userId: string
}

/**
 * Example component showing how to use Sentry instrumentation
 */
function ExampleComponent({ userId }: ExampleComponentProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create instrumented action handlers
  const trackAction = useSentryAction('example.button.click')
  const logger = enhancedObservability.getLogger('ExampleComponent')

  const handleButtonClick = trackAction(async () => {
    setIsLoading(true)
    setError(null)

    // Create a transaction for the entire operation
    return Sentry.startSpan(
      {
        op: 'ui.action.process',
        name: 'Process Example Data',
      },
      async (span) => {
        try {
          // Log the action
          logger.info('Processing example data', { userId })

          // Add breadcrumb
          Sentry.addBreadcrumb({
            message: 'Starting data processing',
            category: 'user-action',
            level: 'info',
            data: { userId },
          })

          // Simulate API call with span
          const data = await Sentry.startSpan(
            {
              op: 'http.client',
              name: 'GET /api/example',
            },
            async () => {
              const response = await fetch('/api/example', {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              })

              if (!response.ok) {
                throw new Error(`API error: ${response.status}`)
              }

              return response.json()
            }
          )

          // Track success metric
          enhancedObservability.trackIncrement('example.process.success', 1, {
            userId,
          })

          logger.info('Data processed successfully', { dataCount: data.length })

          // Set success status
          span?.setStatus('ok')
        } catch (error) {
          // Log error
          logger.error('Failed to process data', error as Error, { userId })

          // Track error metric
          enhancedObservability.trackIncrement('example.process.error', 1, {
            userId,
            errorType: (error as Error).name,
          })

          // Capture exception with context
          Sentry.captureException(error, {
            tags: {
              component: 'ExampleComponent',
              action: 'processData',
              userId,
            },
            extra: {
              timestamp: new Date().toISOString(),
            },
          })

          setError((error as Error).message)

          // Set error status
          span?.setStatus('internal_error')
        } finally {
          setIsLoading(false)
        }
      }
    )
  })

  const handleComplexOperation = async () => {
    // Start a timer
    const timer = enhancedObservability.createTimer('example.complex.duration', {
      userId,
    })

    try {
      // Simulate complex operation
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Track custom metric
      enhancedObservability.trackDistribution('example.processing.time', 1000, 'millisecond', {
        operation: 'complex',
        userId,
      })

      // Log event
      await enhancedObservability.logEvent(
        'info',
        'Complex operation completed',
        {
          userId,
          duration: 1000,
        },
        'ExampleComponent',
        ['complex-operation', 'success']
      )
    } finally {
      timer.end()
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Sentry Instrumented Component Example</h2>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded">Error: {error}</div>}

      <div className="space-x-4">
        <button
          onClick={handleButtonClick}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Process Data'}
        </button>

        <button
          onClick={handleComplexOperation}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Complex Operation
        </button>

        <button
          onClick={() => {
            // Intentionally throw an error to test error boundary
            throw new Error('Test error boundary')
          }}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Trigger Error
        </button>
      </div>

      <div className="text-sm text-gray-600">
        <p>This component demonstrates:</p>
        <ul className="list-disc ml-5 mt-2">
          <li>Sentry performance monitoring with spans</li>
          <li>Error tracking and exception capture</li>
          <li>Custom metrics and events</li>
          <li>Breadcrumb logging</li>
          <li>Integration with existing observability</li>
        </ul>
      </div>
    </div>
  )
}

// Export with Sentry instrumentation HOC
export default withSentryInstrumentation(ExampleComponent, 'ExampleComponent')
