// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest'

export async function GET() {
  try {
    // Test basic Inngest configuration
    const config = {
      isDev: process.env.NODE_ENV === 'development' || process.env.INNGEST_DEV === '1',
      hasEventKey: !!process.env.INNGEST_EVENT_KEY,
      hasSigningKey: !!process.env.INNGEST_SIGNING_KEY,
      environment: process.env.NODE_ENV,
    }

    // Try to send a test event
    let eventSent = false
    let eventError = null

    try {
      await inngest.send({
        name: 'test/ping',
        data: { timestamp: new Date().toISOString() },
      })
      eventSent = true
    } catch (error) {
      eventError = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json({
      status: 'ok',
      config,
      eventTest: {
        sent: eventSent,
        error: eventError,
      },
      message: 'Inngest configuration test endpoint',
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
