import { type NextRequest, NextResponse } from 'next/server'
import { GeminiRealtimeSession } from '@/lib/ai/gemini-realtime'
import { redisCache } from '@/lib/redis'

// Session data interface for Redis storage
interface SessionData {
  sessionId: string
  voiceName?: string
  tools?: unknown[]
  createdAt: Date
  lastAccessedAt: Date
  isActive: boolean
}

// In-memory session instances (Redis stores metadata, memory stores active connections)
const activeSessions = new Map<string, GeminiRealtimeSession>()

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { sessionId, voiceName, tools } = body

    // Create session metadata for Redis
    const sessionData: SessionData = {
      sessionId,
      voiceName,
      tools,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      isActive: true,
    }

    // Store session metadata in Redis
    await redisCache.cacheSession(sessionId, sessionData, 3600) // 1 hour TTL

    // Create a new session instance
    const session = new GeminiRealtimeSession({
      apiKey,
      voiceName,
      tools,
      onMessage: (_message) => {
        // Update last accessed time when receiving messages
        redisCache.cacheSession(
          sessionId,
          {
            ...sessionData,
            lastAccessedAt: new Date(),
          },
          3600
        )
      },
      onError: (_error) => {
        // Handle errors and potentially mark session as inactive
        console.error('Gemini session error:', _error)
      },
    })

    await session.connect()
    activeSessions.set(sessionId, session)

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

    // Close active session if it exists
    const session = activeSessions.get(sessionId)
    if (session) {
      session.close()
      activeSessions.delete(sessionId)
    }

    // Remove session metadata from Redis
    await redisCache.deleteSession(sessionId)

    return NextResponse.json({
      success: true,
      message: 'Session closed successfully',
    })
  } catch (error) {
    console.error('Failed to close Gemini session:', error)
    return NextResponse.json({ error: 'Failed to close session' }, { status: 500 })
  }
}
