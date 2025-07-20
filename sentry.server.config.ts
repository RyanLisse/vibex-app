// This file configures the initialization of Sentry on the server side.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Enable experimental features
  _experiments: {
    enableLogs: true,
  },

  integrations: [
    // Automatically capture console errors
    Sentry.consoleLoggingIntegration({
      levels: ['error', 'warn', 'info'],
    }),
  ],

  // Environment
  environment: process.env.NODE_ENV,

  // BeforeSend callback for filtering/modifying events
  beforeSend(event, hint) {
    // Filter out certain errors in production
    if (process.env.NODE_ENV === 'production') {
      const error = hint.originalException

      // Don't send events for expected errors
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as any).code
        if (['NEXT_NOT_FOUND', 'NEXT_REDIRECT'].includes(errorCode)) {
          return null
        }
      }
    }

    return event
  },

  // Ignore specific transactions
  ignoreTransactions: [
    // Health check endpoints
    '/api/health',
    '/api/db/health',
    // Static assets
    '/_next/static',
    '/_next/image',
    // Development only
    '/_next/webpack-hmr',
  ],
})
