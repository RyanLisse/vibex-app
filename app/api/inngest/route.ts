import { serve } from 'inngest/next'
import { createTask, inngest } from '@/lib/inngest'

export const maxDuration = 60

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [createTask],
})
