// Main Sentry integration export file

// Re-export commonly used Sentry functions
export { captureException, captureMessage, startSpan } from '@sentry/nextjs'
export { enhancedObservability } from '@/lib/observability/enhanced'
export {
  addBreadcrumb,
  clearSentryUser,
  instrumentApiRoute,
  instrumentDatabaseOperation,
  instrumentInngestFunction,
  instrumentServerAction,
  setSentryContext,
  setSentryTags,
  setSentryUser,
} from './instrumentation'
export { getSentryLogger, SentryEnhancedLogger } from './logger'
