// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAlertService, logger } from '@/app/api/alerts/_lib/setup'

export async function GET(request: NextRequest) {
  try {
    const alertService = getAlertService()
    await alertService.initialize()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')

    const alertHistory = await alertService.getAlertHistory(limit)

    logger.info('Alert history retrieved', {
      count: alertHistory.length,
      limit,
      endpoint: '/api/alerts/history',
    })

    return NextResponse.json({
      success: true,
      alerts: alertHistory,
      count: alertHistory.length,
      limit,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Failed to get alert history', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/alerts/history',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve alert history',
        alerts: [],
        count: 0,
      },
      { status: 500 }
    )
  }
}
