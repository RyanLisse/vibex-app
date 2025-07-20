// This file configures the initialization of Sentry on the client side.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // You can enable the Replay session recorder like this:
  // Note: This can impact your app's performance and increase your Sentry quota usage.
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.

  integrations: [
    // Automatically capture console errors
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn'],
    }),
    // Replay recording
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Enable experimental features
  _experiments: {
    enableLogs: true,
  },

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Facebook blocked
    'fb_xd_fragment',
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    // React development warnings
    /^Warning: /,
    // Network errors that are expected
    'NetworkError',
    'Network request failed',
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
})
