/**
 * Observability System Main Export
 *
 * Comprehensive observability system that provides event collection,
 * performance metrics, real-time streaming, and monitoring capabilities
 * for the database observability integration.
 */

// Re-export all observability components
export * from './events'
export * from './metrics'
export * from './streaming'

// Import main components
import { observabilityEvents, ObservabilityEventCollector } from './events'
import { metrics, PerformanceMetricsCollector } from './metrics'
import { eventStream, EventStreamManager } from './streaming'

// Observability system manager
export class ObservabilitySystem {
  private static instance: ObservabilitySystem
  private initialized = false

  private constructor() {}

  static getInstance(): ObservabilitySystem {
    if (!ObservabilitySystem.instance) {
      ObservabilitySystem.instance = new ObservabilitySystem()
    }
    return ObservabilitySystem.instance
  }

  /**
   * Initialize the observability system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      console.log('🔍 Initializing Observability System...')

      // Initialize event collection
      const eventCollector = ObservabilityEventCollector.getInstance()
      console.log('✅ Event collection system initialized')

      // Initialize metrics collection
      const metricsCollector = PerformanceMetricsCollector.getInstance()
      console.log('✅ Performance metrics system initialized')

      // Initialize event streaming
      const streamManager = EventStreamManager.getInstance()
      console.log('✅ Real-time event streaming initialized')

      // Set up system monitoring
      this.setupSystemMonitoring()
      console.log('✅ System monitoring configured')

      // Record initialization event
      await observabilityEvents.collector.collectEvent(
        'system_event',
        'info',
        'Observability system initialized',
        {
          initializationTime: Date.now(),
          components: ['events', 'metrics', 'streaming', 'monitoring'],
        },
        'observability',
        ['system', 'initialization']
      )

      this.initialized = true
      console.log('🎉 Observability System fully initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Observability System:', error)
      throw error
    }
  }

  /**
   * Set up system monitoring
   */
  private setupSystemMonitoring(): void {
    // Monitor system health every 30 seconds
    setInterval(async () => {
      try {
        await this.collectSystemHealthMetrics()
      } catch (error) {
        console.error('Error collecting system health metrics:', error)
      }
    }, 30000)

    // Monitor memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      setInterval(() => {
        const memUsage = process.memoryUsage()
        metrics.memoryUsage(memUsage.heapUsed, 'heap')
        metrics.memoryUsage(memUsage.rss, 'rss')
        metrics.memoryUsage(memUsage.external, 'external')
      }, 10000)
    }

    // Monitor event stream health
    setInterval(() => {
      const streamStats = eventStream.manager.getSubscriptionStats()
      metrics.collector.recordMetric('throughput', streamStats.active, {
        component: 'event_stream',
        metric: 'active_subscriptions',
      })
    }, 15000)
  }

  /**
   * Collect system health metrics
   */
  private async collectSystemHealthMetrics(): Promise<void> {
    try {
      // Calculate health score for the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const now = new Date()

      const healthScore = await metrics.analyzer.calculateHealthScore({
        start: oneHourAgo,
        end: now,
      })

      // Record health metrics
      metrics.collector.recordMetric('throughput', healthScore.overall, {
        component: 'system',
        metric: 'health_score',
      })

      metrics.collector.recordMetric('throughput', healthScore.components.database, {
        component: 'database',
        metric: 'health_score',
      })

      metrics.collector.recordMetric('throughput', healthScore.components.sync, {
        component: 'sync',
        metric: 'health_score',
      })

      metrics.collector.recordMetric('throughput', healthScore.components.wasm, {
        component: 'wasm',
        metric: 'health_score',
      })

      metrics.collector.recordMetric('throughput', healthScore.components.queries, {
        component: 'queries',
        metric: 'health_score',
      })

      // Log health status if concerning
      if (healthScore.overall < 80) {
        await observabilityEvents.collector.collectEvent(
          'system_event',
          healthScore.overall < 50 ? 'critical' : 'warn',
          `System health score: ${healthScore.overall.toFixed(1)}%`,
          {
            healthScore: healthScore.overall,
            components: healthScore.components,
          },
          'monitoring',
          ['health', 'system']
        )
      }
    } catch (error) {
      console.error('Error collecting system health metrics:', error)
    }
  }

  /**
   * Shutdown the observability system
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return

    try {
      console.log('🔍 Shutting down Observability System...')

      // Record shutdown event
      await observabilityEvents.collector.collectEvent(
        'system_event',
        'info',
        'Observability system shutting down',
        { shutdownTime: Date.now() },
        'observability',
        ['system', 'shutdown']
      )

      // Flush all pending data
      await observabilityEvents.collector.forceFlush()
      await metrics.collector.forceFlush()

      // Stop periodic processes
      observabilityEvents.collector.stopPeriodicFlush()
      metrics.collector.stopPeriodicFlush()
      eventStream.manager.stopEventPolling()

      this.initialized = false
      console.log('✅ Observability System shutdown complete')
    } catch (error) {
      console.error('❌ Error during Observability System shutdown:', error)
      throw error
    }
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    initialized: boolean
    components: {
      events: boolean
      metrics: boolean
      streaming: boolean
    }
    stats: {
      activeSubscriptions: number
      bufferedEvents: number
    }
  } {
    return {
      initialized: this.initialized,
      components: {
        events: true, // Always available once initialized
        metrics: true, // Always available once initialized
        streaming: true, // Always available once initialized
      },
      stats: {
        activeSubscriptions: eventStream.manager.getActiveSubscriptionsCount(),
        bufferedEvents: eventStream.manager.getBufferedEvents().length,
      },
    }
  }

  /**
   * Force flush all systems
   */
  async forceFlush(): Promise<void> {
    await Promise.all([observabilityEvents.collector.forceFlush(), metrics.collector.forceFlush()])
  }
}

// Main observability system instance
export const observability = {
  system: ObservabilitySystem.getInstance(),
  events: observabilityEvents,
  metrics,
  stream: eventStream,

  // Convenience methods
  initialize: () => ObservabilitySystem.getInstance().initialize(),
  shutdown: () => ObservabilitySystem.getInstance().shutdown(),
  getStatus: () => ObservabilitySystem.getInstance().getSystemStatus(),
  forceFlush: () => ObservabilitySystem.getInstance().forceFlush(),
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize on next tick to avoid blocking
  setTimeout(() => {
    observability.initialize().catch(console.error)
  }, 0)
}

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down observability system...`)
    try {
      await observability.shutdown()
      process.exit(0)
    } catch (error) {
      console.error('Error during graceful shutdown:', error)
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
}

// Default export
export default observability
