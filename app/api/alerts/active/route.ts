import { NextRequest, NextResponse } from 'next/server'
import { AlertService } from '@/lib/alerts/alert-service'
import { redis } from '@/lib/redis/redis-client'
import { ComponentLogger } from '@/lib/logging/logger-factory'

const logger = new ComponentLogger('AlertsActiveAPI')
const alertService = new AlertService(redis)

export async function GET(request: NextRequest) {
  try {
    await alertService.initialize()
    
    const activeAlerts = await alertService.getActiveAlerts()
    
    logger.info('Active alerts retrieved', {
      count: activeAlerts.length,
      endpoint: '/api/alerts/active'
    })

    return NextResponse.json({
      success: true,
      alerts: activeAlerts,
      count: activeAlerts.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Failed to get active alerts', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/alerts/active'
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve active alerts',
        alerts: [],
        count: 0
      },
      { status: 500 }
    )
  }
}