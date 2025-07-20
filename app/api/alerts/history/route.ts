import { NextRequest, NextResponse } from 'next/server'
import { AlertService } from '@/lib/alerts/alert-service'
import { redis } from '@/lib/redis/redis-client'
import { ComponentLogger } from '@/lib/logging/logger-factory'

const logger = new ComponentLogger('AlertsHistoryAPI')
const alertService = new AlertService(redis)

export async function GET(request: NextRequest) {
  try {
    await alertService.initialize()
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    
    const alertHistory = await alertService.getAlertHistory(limit)
    
    logger.info('Alert history retrieved', {
      count: alertHistory.length,
      limit,
      endpoint: '/api/alerts/history'
    })

    return NextResponse.json({
      success: true,
      alerts: alertHistory,
      count: alertHistory.length,
      limit,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Failed to get alert history', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/alerts/history'
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve alert history',
        alerts: [],
        count: 0
      },
      { status: 500 }
    )
  }
}