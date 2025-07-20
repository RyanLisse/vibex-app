// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAlertService, logger } from '@/app/api/alerts/_lib/setup'

export async function GET(request: NextRequest) {
  try {
    const alertService = getAlertService()
    await alertService.initialize()

    const activeAlerts = await alertService.getActiveAlerts()

    logger.info('Active alerts retrieved', {
      count: activeAlerts.length,
      endpoint: '/api/alerts/active',
    })

    return NextResponse.json({
      success: true,
      alerts: activeAlerts,
      count: activeAlerts.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Failed to get active alerts', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/alerts/active',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve active alerts',
        alerts: [],
        count: 0,
      },
      { status: 500 }
    )
  }
}
