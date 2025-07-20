// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { type NextRequest, NextResponse } from 'next/server'
import { getLogger } from '@/lib/logging/safe-wrapper'

const logger = getLogger('client-error-logging')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { level, message, error, timestamp } = body

    // Validate the request
    if (!(level && message)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Log based on level
    switch (level.toLowerCase()) {
      case 'error':
        logger.error(message, error instanceof Error ? error : new Error(String(error)), {
          source: 'client',
          timestamp,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        })
        break
      case 'warn':
        logger.warn(message, {
          source: 'client',
          error: error instanceof Error ? error.message : String(error),
          timestamp,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        })
        break
      case 'info':
        logger.info(message, {
          source: 'client',
          error: error instanceof Error ? error.message : String(error),
          timestamp,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        })
        break
      default:
        logger.debug(message, {
          source: 'client',
          error: error instanceof Error ? error.message : String(error),
          timestamp,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        })
    }

    return NextResponse.json({ success: true })
  } catch (_error) {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
