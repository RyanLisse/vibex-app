// Main Sentry integration export file
export {
  instrumentApiRoute,
  instrumentDatabaseOperation,
  instrumentServerAction,
  instrumentInngestFunction,
  addBreadcrumb,
  setSentryUser,
  clearSentryUser,
  setSentryContext,
  setSentryTags,
} from './instrumentation'

export { SentryEnhancedLogger, getSentryLogger } from './logger'

export { enhancedObservability } from '@/lib/observability/enhanced'

// Re-export commonly used Sentry functions
export { captureException, captureMessage, startSpan } from '@sentry/nextjs'
