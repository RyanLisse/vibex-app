import type { NextRequest, NextResponse } from 'next/server'
import { CorrelationIdManager } from './correlation-id-manager'
import { createDefaultLoggingConfig } from './defaults'
import { LoggerFactory } from './logger-factory'

export function createLoggingMiddleware() {
  const config = createDefaultLoggingConfig()
  const loggerFactory = LoggerFactory.getInstance(config)
  const correlationManager = CorrelationIdManager.getInstance()
  const logger = loggerFactory.createLogger('middleware')

  return async function loggingMiddleware(
    request: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now()
    const correlationId = correlationManager.extractFromRequest(request)

    return correlationManager.withIdAsync(correlationId, async () => {
      const context = {
        correlationId,
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        ip: request.ip,
      }

      return loggerFactory.withContextAsync(context, async () => {
        try {
          const response = await next()
          const duration = Date.now() - startTime

          logger.apiRequest(request, response, duration)
          correlationManager.injectIntoResponse(response, correlationId)

          return response
        } catch (error) {
          const duration = Date.now() - startTime
          logger.apiError(request, error as Error)

          throw error
        }
      })
    })
  }
}

export function createApiRouteLogger() {
  const config = createDefaultLoggingConfig()
  const loggerFactory = LoggerFactory.getInstance(config)
  const correlationManager = CorrelationIdManager.getInstance()

  return function withLogging<T>(handler: (req: NextRequest) => Promise<T>) {
    return async function loggedHandler(req: NextRequest): Promise<T> {
      const startTime = Date.now()
      const logger = loggerFactory.createLogger('api-route')
      const correlationId = correlationManager.extractFromRequest(req)

      return correlationManager.withIdAsync(correlationId, async () => {
        const context = {
          correlationId,
          method: req.method,
          url: req.url,
          route: req.nextUrl.pathname,
        }

        return loggerFactory.withContextAsync(context, async () => {
          try {
            logger.info('API Route Start', {
              method: req.method,
              path: req.nextUrl.pathname,
              searchParams: Object.fromEntries(req.nextUrl.searchParams),
            })

            const result = await handler(req)
            const duration = Date.now() - startTime

            logger.info('API Route Success', {
              method: req.method,
              path: req.nextUrl.pathname,
              duration,
            })

            return result
          } catch (error) {
            const duration = Date.now() - startTime

            logger.error('API Route Error', error as Error, {
              method: req.method,
              path: req.nextUrl.pathname,
              duration,
            })

            throw error
          }
        })
      })
    }
  }
}
