import { serve } from 'inngest/next'
import { inngest, createTask } from '@/lib/inngest'

export const maxDuration = 800

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [createTask],
})
