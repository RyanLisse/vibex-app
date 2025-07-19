import { NextRequest, NextResponse } from 'next/server'
import { getLogger } from '@/lib/logging'

const logger = getLogger('client-error-logging')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { level, message, error, timestamp } = body

    // Validate the request
    if (!level || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Log based on level
    switch (level.toLowerCase()) {
      case 'error':
        logger.error(message, error instanceof Error ? error : new Error(String(error)), {
          source: 'client',
          timestamp,
          userAgent: request.headers.get('user-agent'),
          ip: request.ip,
        })
        break
      case 'warn':
        logger.warn(message, {
          source: 'client',
          error: error instanceof Error ? error.message : String(error),
          timestamp,
          userAgent: request.headers.get('user-agent'),
          ip: request.ip,
        })
        break
      case 'info':
        logger.info(message, {
          source: 'client',
          error: error instanceof Error ? error.message : String(error),
          timestamp,
          userAgent: request.headers.get('user-agent'),
          ip: request.ip,
        })
        break
      default:
        logger.debug(message, {
          source: 'client',
          error: error instanceof Error ? error.message : String(error),
          timestamp,
          userAgent: request.headers.get('user-agent'),
          ip: request.ip,
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // Fallback to console if logging fails
    console.error('Failed to log client error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
