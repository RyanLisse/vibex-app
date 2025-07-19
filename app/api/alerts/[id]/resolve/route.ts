import { NextRequest, NextResponse } from 'next/server'
import { AlertService } from '@/lib/alerts/alert-service'
import { redis } from '@/lib/redis/redis-client'
import { ComponentLogger } from '@/lib/logging/logger-factory'

const logger = new ComponentLogger('AlertsResolveAPI')
const alertService = new AlertService(redis)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await alertService.initialize()
    
    const body = await request.json()
    const { resolvedBy } = body
    
    if (!resolvedBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'resolvedBy is required'
        },
        { status: 400 }
      )
    }

    const alertId = params.id
    const resolved = await alertService.resolveAlert(alertId, resolvedBy)
    
    if (!resolved) {
      logger.warn('Alert not found for resolution', {
        alertId,
        resolvedBy,
        endpoint: '/api/alerts/[id]/resolve'
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Alert not found'
        },
        { status: 404 }
      )
    }

    logger.info('Alert resolved successfully', {
      alertId,
      resolvedBy,
      endpoint: '/api/alerts/[id]/resolve'
    })

    return NextResponse.json({
      success: true,
      alertId,
      resolvedBy,
      resolvedAt: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Failed to resolve alert', {
      alertId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/alerts/[id]/resolve'
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to resolve alert'
      },
      { status: 500 }
    )
  }
}