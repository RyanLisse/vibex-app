import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getMultiAgentSystem } from '@/lib/letta/multi-agent-system'
import { getLogger } from '@/lib/logging'

const logger = getLogger('api-agents-voice')

const VoiceMessageSchema = z.object({
  sessionId: z.string(),
})

// POST /api/agents/voice - Process voice message
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const sessionId = formData.get('sessionId') as string
    const audioFile = formData.get('audio') as File

    if (!(sessionId && audioFile)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing sessionId or audio file',
        },
        { status: 400 }
      )
    }

    // Validate sessionId
    VoiceMessageSchema.parse({ sessionId })

    // Convert audio file to ArrayBuffer
    const audioBuffer = await audioFile.arrayBuffer()

    const system = getMultiAgentSystem()
    const response = await system.processVoiceMessage(sessionId, audioBuffer)

    // Convert audio response back to base64 for JSON transport
    const audioBase64 = Buffer.from(response.audioResponse).toString('base64')

    return NextResponse.json({
      success: true,
      data: {
        audioResponse: audioBase64,
        textResponse: response.textResponse,
      },
    })
  } catch (error) {
    logger.error('Error processing voice message', error as Error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process voice message',
      },
      { status: 500 }
    )
  }
}

// GET /api/agents/voice - Get voice capabilities
export function GET() {
  try {
    const system = getMultiAgentSystem()
    const status = system.getSystemStatus()

    return NextResponse.json({
      success: true,
      data: {
        voiceEnabled: status.config.enableVoice,
        supportedFormats: ['wav', 'mp3', 'ogg'],
        maxFileSize: '10MB',
        sampleRate: '16000Hz',
      },
    })
  } catch (error) {
    logger.error('Error getting voice capabilities', error as Error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get voice capabilities',
      },
      { status: 500 }
    )
  }
}
