import { NextRequest, NextResponse } from 'next/server'
import { GeminiRealtimeSession } from '@/lib/ai/gemini-realtime'

// Store sessions in memory (in production, use a proper session store)
const sessions = new Map<string, GeminiRealtimeSession>()

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { sessionId, voiceName, tools } = body

    // Create a new session
    const session = new GeminiRealtimeSession({
      apiKey,
      voiceName,
      tools,
      onMessage: (message) => {
        console.log('Gemini message:', message)
      },
      onError: (error) => {
        console.error('Gemini error:', error)
      },
    })

    await session.connect()
    sessions.set(sessionId, session)

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Session created successfully',
    })
  } catch (error) {
    console.error('Failed to create Gemini session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const session = sessions.get(sessionId)
    if (session) {
      session.close()
      sessions.delete(sessionId)
    }

    return NextResponse.json({
      success: true,
      message: 'Session closed successfully',
    })
  } catch (error) {
    console.error('Failed to close Gemini session:', error)
    return NextResponse.json({ error: 'Failed to close session' }, { status: 500 })
  }
}
