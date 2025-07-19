import { NextRequest, NextResponse } from 'next/server'
import { AlertService } from '@/lib/alerts/alert-service'
import { redis } from '@/lib/redis/redis-client'
import { ComponentLogger } from '@/lib/logging/logger-factory'

const logger = new ComponentLogger('AlertsChannelTestAPI')
const alertService = new AlertService(redis)

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    await alertService.initialize()
    
    const channelName = params.name
    
    if (!channelName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Channel name is required'
        },
        { status: 400 }
      )
    }

    const success = await alertService.testChannel(channelName)
    
    if (success) {
      logger.info('Channel test successful', {
        channelName,
        endpoint: '/api/alerts/channels/[name]/test'
      })

      return NextResponse.json({
        success: true,
        message: `Test alert sent successfully to ${channelName}`,
        channelName,
        timestamp: new Date().toISOString()
      })
    } else {
      logger.warn('Channel test failed', {
        channelName,
        endpoint: '/api/alerts/channels/[name]/test'
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Test alert failed to send',
          channelName
        },
        { status: 400 }
      )
    }

  } catch (error) {
    logger.error('Channel test error', {
      channelName: params.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/alerts/channels/[name]/test'
    })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Channel test failed',
        channelName: params.name
      },
      { status: 500 }
    )
  }
}