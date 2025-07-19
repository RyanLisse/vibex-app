import { channel, realtimeMiddleware, topic } from '@inngest/realtime'
import { VibeKit, type VibeKitConfig } from '@vibe-kit/sdk'
import { Inngest } from 'inngest'

// Create a client to send and receive events
export const inngest = new Inngest({
  id: 'clonedex',
  eventKey: process.env.INNGEST_EVENT_KEY,
  middleware: [realtimeMiddleware()],
  // Enable dev mode for local development
  isDev: process.env.NODE_ENV === 'development' || process.env.INNGEST_DEV === '1',
})

export const taskChannel = channel('tasks')
  .addTopic(
    topic('status').type<{
      taskId: string
      status: 'IN_PROGRESS' | 'DONE' | 'MERGED' | 'PAUSED' | 'CANCELLED'
      sessionId: string
    }>()
  )
  .addTopic(
    topic('update').type<{
      taskId: string
      message: Record<string, unknown>
    }>()
  )
  .addTopic(
    topic('control').type<{
      taskId: string
      action: 'pause' | 'resume' | 'cancel'
    }>()
  )

// Helper function to simulate streaming by chunking text
function* chunkText(text: string, chunkSize = 10): Generator<string, void, unknown> {
  const words = text.split(' ')
  for (let i = 0; i < words.length; i += chunkSize) {
    yield words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '')
  }
}

// Global task control state
const taskControlState = new Map<string, { isPaused: boolean; isCancelled: boolean }>()

export const taskControl = inngest.createFunction(
  { id: 'task-control' },
  { event: 'clonedx/task.control' },
  async ({ event, publish }) => {
    const { taskId, action } = event.data

    // Update task control state
    const currentState = taskControlState.get(taskId) || {
      isPaused: false,
      isCancelled: false,
    }

    switch (action) {
      case 'pause':
        taskControlState.set(taskId, { ...currentState, isPaused: true })
        await publish(
          taskChannel().status({
            taskId,
            status: 'PAUSED',
            sessionId: '',
          })
        )
        break
      case 'resume':
        taskControlState.set(taskId, { ...currentState, isPaused: false })
        await publish(
          taskChannel().status({
            taskId,
            status: 'IN_PROGRESS',
            sessionId: '',
          })
        )
        break
      case 'cancel':
        taskControlState.set(taskId, { ...currentState, isCancelled: true })
        await publish(
          taskChannel().status({
            taskId,
            status: 'CANCELLED',
            sessionId: '',
          })
        )
        break
    }

    return { success: true, action, taskId }
  }
)

export const createTask = inngest.createFunction(
  { id: 'create-task' },
  { event: 'clonedex/create.task' },
  async ({ event, step, publish }) => {
    const { task, token, sessionId, prompt } = event.data

    // Initialize task control state
    taskControlState.set(task.id, { isPaused: false, isCancelled: false })
    const config: VibeKitConfig = {
      agent: {
        type: 'codex',
        model: {
          apiKey: process.env.OPENAI_API_KEY!,
        },
      },
      environment: {
        e2b: {
          apiKey: process.env.E2B_API_KEY!,
        },
      },
      github: {
        token,
        repository: task.repository,
      },
    }

    const result = await step.run('generate-code', async () => {
      const vibekit = new VibeKit(config)

      if (sessionId) {
        await vibekit.setSession(sessionId)
      }

      const response = await vibekit.generateCode({
        prompt: prompt || task.title,
        mode: task.mode,
        callbacks: {
          onUpdate(message) {
            try {
              const parsedMessage = JSON.parse(message)

              // For assistant messages, implement streaming
              if (parsedMessage.type === 'message' && parsedMessage.role === 'assistant') {
                const messageId = parsedMessage.data?.id || crypto.randomUUID()
                const fullText = parsedMessage.data?.text || ''

                // Stream the message in chunks
                let accumulatedText = ''
                const chunks = Array.from(chunkText(fullText, 5)) // 5 words per chunk

                chunks.forEach((chunk, index) => {
                  accumulatedText += chunk

                  setTimeout(() => {
                    publish(
                      taskChannel().update({
                        taskId: task.id,
                        message: {
                          ...parsedMessage,
                          data: {
                            ...parsedMessage.data,
                            id: messageId,
                            text: accumulatedText,
                            isStreaming: index < chunks.length - 1,
                            streamId: messageId,
                            chunkIndex: index,
                            totalChunks: chunks.length,
                          },
                        },
                      })
                    )
                  }, index * 50) // 50ms delay between chunks for smooth streaming
                })
              } else {
                // Non-message updates (like git operations, etc.)
                publish(
                  taskChannel().update({
                    taskId: task.id,
                    message: parsedMessage,
                  })
                )
              }
            } catch {
              // If it's not JSON, it might be raw streaming output
              // Create a streaming message for it
              const streamId = `stream-${Date.now()}`
              publish(
                taskChannel().update({
                  taskId: task.id,
                  message: {
                    type: 'message',
                    role: 'assistant',
                    data: {
                      text: message,
                      isStreaming: true,
                      streamId,
                      raw: true,
                    },
                  },
                })
              )
            }
          },
        },
      })

      await vibekit.pause()

      return response
    })

    if ('stdout' in result) {
      const lines = result.stdout.trim().split('\n')
      const parsedLines = lines.map((line) => JSON.parse(line))
      await publish(
        taskChannel().status({
          taskId: task.id,
          status: 'DONE',
          sessionId: result.sandboxId,
        })
      )

      return { message: parsedLines }
    }
    return { message: result }
  }
)

let app: Inngest | undefined

export const getInngestApp = () => {
  return (app ??= new Inngest({
    id: typeof window !== 'undefined' ? 'client' : 'server',
    middleware: [realtimeMiddleware()],
  }))
}
