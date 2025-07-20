// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { type NextRequest, NextResponse } from 'next/server'
import { getAlertService, logger } from '@/app/api/alerts/_lib/setup'
import type { AlertChannelType, AlertMetrics, CriticalErrorType } from '@/lib/alerts/types'

export async function GET(_request: NextRequest) {
  try {
    const alertService = getAlertService()
    await alertService.initialize()

    const activeAlerts = await alertService.getActiveAlerts()
    const alertHistory = await alertService.getAlertHistory(1000)

    // Calculate metrics
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const last24HourAlerts = alertHistory.filter((a) => new Date(a.timestamp) >= last24Hours)
    const last7DayAlerts = alertHistory.filter((a) => new Date(a.timestamp) >= last7Days)

    // Group alerts by type
    const alertsByType: Record<CriticalErrorType, number> = {} as Record<CriticalErrorType, number>
    for (const alert of alertHistory) {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1
    }

    // Group alerts by channel (this would need to be tracked during alert processing)
    const alertsByChannel: Record<AlertChannelType, number> = {} as Record<AlertChannelType, number>

    // Calculate resolution times
    const resolvedAlerts = alertHistory.filter((a) => a.resolved && a.resolvedAt)
    const resolutionTimes = resolvedAlerts.map((a) => {
      const resolvedAt = new Date(a.resolvedAt!).getTime()
      const timestamp = new Date(a.timestamp).getTime()
      return resolvedAt - timestamp
    })

    const averageResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
        : 0

    const metrics: AlertMetrics = {
      totalAlerts: alertHistory.length,
      alertsByType,
      alertsByChannel,
      averageResolutionTime,
      unresolvedAlerts: activeAlerts.length,
      alertsLast24Hours: last24HourAlerts.length,
      alertsLast7Days: last7DayAlerts.length,
      meanTimeToAlert: 0, // Would need additional tracking
      meanTimeToResolution: averageResolutionTime,
    }

    logger.info('Alert metrics calculated', {
      totalAlerts: metrics.totalAlerts,
      unresolvedAlerts: metrics.unresolvedAlerts,
      averageResolutionTime: metrics.averageResolutionTime,
      endpoint: '/api/alerts/metrics',
    })

    return NextResponse.json({
      success: true,
      ...metrics,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Failed to get alert metrics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/alerts/metrics',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve alert metrics',
        totalAlerts: 0,
        unresolvedAlerts: 0,
        alertsByType: {},
        alertsByChannel: {},
        averageResolutionTime: 0,
        alertsLast24Hours: 0,
        alertsLast7Days: 0,
        meanTimeToAlert: 0,
        meanTimeToResolution: 0,
      },
      { status: 500 }
    )
  }
}
