// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getMultiAgentSystem } from '@/lib/letta/multi-agent-system'
import { getLogger } from '@/lib/logging/safe-wrapper'

const logger = getLogger('api-agents')

// Request schemas
const CreateSessionSchema = z.object({
  userId: z.string(),
  type: z.enum(['chat', 'voice', 'brainstorm', 'multi-agent']).default('chat'),
})

const SendMessageSchema = z.object({
  sessionId: z.string(),
  message: z.string(),
  streaming: z.boolean().default(false),
})

const StartBrainstormSchema = z.object({
  sessionId: z.string(),
  topic: z.string(),
})

// GET /api/agents - Get system status
export function GET() {
  try {
    const system = getMultiAgentSystem()
    const status = system.getSystemStatus()

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error) {
    logger.error('Error getting system status', error as Error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get system status',
      },
      { status: 500 }
    )
  }
}

// POST /api/agents - Create session or send message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    const system = getMultiAgentSystem()

    switch (action) {
      case 'create_session': {
        const { userId, type } = CreateSessionSchema.parse(body)
        const session = await system.createSession(userId, type)

        return NextResponse.json({
          success: true,
          data: { session },
        })
      }

      case 'send_message': {
        const { sessionId, message, streaming } = SendMessageSchema.parse(body)

        if (streaming) {
          // Handle streaming response
          const stream = await system.processMessage(sessionId, message, true)

          if (stream instanceof ReadableStream) {
            return new Response(stream, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
              },
            })
          }
        }

        const response = await system.processMessage(sessionId, message, false)

        return NextResponse.json({
          success: true,
          data: { response },
        })
      }

      case 'start_brainstorm': {
        const { sessionId, topic } = StartBrainstormSchema.parse(body)
        const brainstormSession = await system.startBrainstormSession(sessionId, topic)

        return NextResponse.json({
          success: true,
          data: { brainstormSession },
        })
      }

      case 'get_brainstorm_summary': {
        const { sessionId } = z.object({ sessionId: z.string() }).parse(body)
        const summary = await system.getBrainstormSummary(sessionId)

        return NextResponse.json({
          success: true,
          data: summary,
        })
      }

      case 'advance_brainstorm_stage': {
        const { sessionId } = z.object({ sessionId: z.string() }).parse(body)
        const session = await system.advanceBrainstormStage(sessionId)

        return NextResponse.json({
          success: true,
          data: { session },
        })
      }

      case 'end_session': {
        const { sessionId } = z.object({ sessionId: z.string() }).parse(body)
        await system.endSession(sessionId)

        return NextResponse.json({
          success: true,
          data: { message: 'Session ended successfully' },
        })
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
          },
          { status: 400 }
        )
    }
  } catch (error) {
    logger.error('Error processing agent request', error as Error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
