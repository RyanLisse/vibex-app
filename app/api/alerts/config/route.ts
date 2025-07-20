// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { type NextRequest, NextResponse } from 'next/server'
import { getAlertService, logger } from '@/app/api/alerts/_lib/setup'
import type { AlertConfig } from '@/lib/alerts/types'

export async function GET(_request: NextRequest) {
  try {
    const alertService = getAlertService()
    await alertService.initialize()

    const config = alertService.getConfig()

    logger.info('Alert configuration retrieved', {
      enabled: config.enabled,
      channelCount: config.channels.length,
      endpoint: '/api/alerts/config',
    })

    return NextResponse.json({
      success: true,
      config,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Failed to get alert configuration', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/alerts/config',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve alert configuration',
        config: null,
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const alertService = getAlertService()
    await alertService.initialize()

    const body = await request.json()
    const { config } = body as { config: AlertConfig }

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration is required',
        },
        { status: 400 }
      )
    }

    // Validate configuration
    if (!(config.channels && Array.isArray(config.channels))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid channels configuration',
        },
        { status: 400 }
      )
    }

    // Validate each channel
    for (const channel of config.channels) {
      if (!(channel.name && channel.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid channel configuration: ${channel.name || 'unnamed'}`,
          },
          { status: 400 }
        )
      }
    }

    await alertService.updateConfig(config)

    logger.info('Alert configuration updated', {
      enabled: config.enabled,
      channelCount: config.channels.length,
      enabledChannels: config.channels.filter((c) => c.enabled).length,
      endpoint: '/api/alerts/config',
    })

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Failed to update alert configuration', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/alerts/config',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update alert configuration',
      },
      { status: 500 }
    )
  }
}
