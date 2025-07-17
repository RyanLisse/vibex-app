import { serve } from 'inngest/next'
import { createTask, inngest, taskControl } from '@/lib/inngest'

// Set max duration for Vercel functions
export const maxDuration = 60

// Export runtime configuration for edge compatibility
export const runtime = 'nodejs'

// Configure Inngest serve handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [createTask, taskControl],
  // Add signing key for production
  signingKey: process.env.INNGEST_SIGNING_KEY,
  // Add serve path configuration
  servePath: '/api/inngest',
})
