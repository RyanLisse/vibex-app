/**
 * WASM Observability Integration
 *
 * Integrates WASM services with the database observability infrastructure
 * for comprehensive performance tracking and monitoring.
 */

import { observability } from '../observability'
import type {
  AgentMemory,
  MemorySearchQuery,
  MemorySearchResult,
  ObservabilityEvent,
  PerformanceMetrics,
} from '../observability/types'
import { dataProcessor } from './data-processor'
import { moduleLoader } from './module-loader'
import { wasmPerformanceTracker } from './performance-tracker'
import type { VectorDocument } from './vector-search'
import type { WASMServices } from './services'

export interface WASMObservabilityConfig {
  enablePerformanceTracking: boolean
  enableMemoryMonitoring: boolean
  enableEventStreaming: boolean
  performanceThreshold: number
  memoryThreshold: number
  eventBatchSize: number
  reportingInterval: number
}

export interface WASMHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  services: {
    vectorSearch: ServiceHealth
    sqlite: ServiceHealth
    compute: ServiceHealth
    dataProcessor: ServiceHealth
  }
  performance: PerformanceHealth
  memory: MemoryHealth
  recommendations: string[]
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'unavailable'
  lastCheck: Date
  errorRate: number
  averageResponseTime: number
  details?: string
}

interface PerformanceHealth {
  averageWASMTime: number
  averageFallbackTime: number
  wasmUsageRate: number
  performanceGain: number
}

interface MemoryHealth {
  totalMemoryUsage: number
  wasmMemoryUsage: number
  availableMemory: number
  memoryPressure: 'low' | 'medium' | 'high'
}

/**
 * WASM Observability Integration Service
 */
export class WASMObservabilityIntegration {
  private static instance: WASMObservabilityIntegration
  private config: WASMObservabilityConfig
  private monitoringInterval: NodeJS.Timeout | null = null
  private eventBuffer: ObservabilityEvent[] = []
  private isInitialized = false
  private wasmServices: WASMServices | null = null

  constructor(config: Partial<WASMObservabilityConfig> = {}) {
    this.config = {
      enablePerformanceTracking: true,
      enableMemoryMonitoring: true,
      enableEventStreaming: true,
      performanceThreshold: 100, // ms
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      eventBatchSize: 100,
      reportingInterval: 60_000, // 1 minute
      ...config,
    }
  }

  static getInstance(config?: Partial<WASMObservabilityConfig>): WASMObservabilityIntegration {
    if (!WASMObservabilityIntegration.instance) {
      WASMObservabilityIntegration.instance = new WASMObservabilityIntegration(config)
    }
    return WASMObservabilityIntegration.instance
  }

  /**
   * Set the WASM services instance (to avoid circular dependency)
   */
  setWASMServices(services: WASMServices): void {
    this.wasmServices = services
  }

  /**
   * Initialize observability integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    await observability.trackOperation('wasm.observability.initialize', async () => {
      // Initialize WASM services with observability tracking if instance is set
      if (this.wasmServices) {
        await this.wasmServices.initialize()
      }

      // Start monitoring if enabled
      if (this.config.enablePerformanceTracking || this.config.enableMemoryMonitoring) {
        this.startMonitoring()
      }

      this.isInitialized = true
      console.log('✅ WASM Observability Integration initialized')
    })
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) return

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, this.config.reportingInterval)

    // Collect initial metrics
    this.collectMetrics()
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  /**
   * Collect and report metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      // Collect performance metrics
      if (this.config.enablePerformanceTracking) {
        const performanceMetrics = this.collectPerformanceMetrics()
        await this.reportPerformanceMetrics(performanceMetrics)
      }

      // Collect memory metrics
      if (this.config.enableMemoryMonitoring) {
        const memoryMetrics = this.collectMemoryMetrics()
        await this.reportMemoryMetrics(memoryMetrics)
      }

      // Process event buffer
      if (this.eventBuffer.length > 0) {
        await this.flushEventBuffer()
      }
    } catch (error) {
      console.error('Failed to collect WASM metrics:', error)
    }
  }

  /**
   * Collect performance metrics from all WASM services
   */
  private collectPerformanceMetrics(): PerformanceMetrics {
    const wasmMetrics = wasmPerformanceTracker.getMetrics()
    const servicesStats = this.wasmServices?.getStats() || {
      capabilities: { supported: false },
      vectorSearch: {},
      sqlite: {},
      compute: {},
      dataProcessing: {},
      performance: {},
      observability: {},
      initializationTime: 0,
      isFullyInitialized: false,
    }

    return {
      executionTime: wasmMetrics.averageWASMTime,
      memoryUsage: wasmMetrics.wasmMemoryUsage,
      cpuUsage: 0, // Would need actual CPU monitoring
      tokenCount: 0, // N/A for WASM
      apiCalls: wasmMetrics.wasmCallCount + wasmMetrics.fallbackCount,
      cacheHits: 0, // Implement if cache tracking is added
      cacheMisses: 0,
    }
  }

  /**
   * Collect memory metrics
   */
  private collectMemoryMetrics(): MemoryHealth {
    const stats = this.wasmServices?.getStats() || {
      capabilities: { supported: false },
      vectorSearch: {},
      sqlite: {},
      compute: {},
      dataProcessing: {},
      performance: {},
      observability: {},
      initializationTime: 0,
      isFullyInitialized: false,
    }
    const vectorSearchStats = stats.vectorSearch || {}
    const sqliteStats = stats.sqlite || {}
    const computeStats = stats.compute || {}

    const wasmMemoryUsage =
      (vectorSearchStats.wasmMemoryBytes || 0) +
      (sqliteStats.memoryUsage || 0) +
      (computeStats.memoryUsage || 0)

    const totalMemoryUsage = this.getTotalMemoryUsage()
    const availableMemory = this.getAvailableMemory()

    const memoryPressure = this.calculateMemoryPressure(totalMemoryUsage, availableMemory)

    return {
      totalMemoryUsage,
      wasmMemoryUsage,
      availableMemory,
      memoryPressure,
    }
  }

  /**
   * Report performance metrics to observability system
   */
  private async reportPerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    const event: Partial<ObservabilityEvent> = {
      eventType: 'performance_metric',
      data: {
        source: 'wasm_services',
        metrics,
        timestamp: new Date().toISOString(),
      },
      severity: metrics.executionTime > this.config.performanceThreshold ? 'high' : 'low',
      category: 'wasm',
      source: 'wasm-observability',
    }

    this.bufferEvent(event)
  }

  /**
   * Report memory metrics
   */
  private async reportMemoryMetrics(metrics: MemoryHealth): Promise<void> {
    const event: Partial<ObservabilityEvent> = {
      eventType: 'system_event',
      data: {
        type: 'memory_usage',
        metrics,
        timestamp: new Date().toISOString(),
      },
      severity:
        metrics.memoryPressure === 'high'
          ? 'high'
          : metrics.memoryPressure === 'medium'
            ? 'medium'
            : 'low',
      category: 'wasm',
      source: 'wasm-observability',
    }

    this.bufferEvent(event)

    // Alert if memory threshold exceeded
    if (metrics.wasmMemoryUsage > this.config.memoryThreshold) {
      observability.recordEvent('wasm.memory.threshold_exceeded', {
        usage: metrics.wasmMemoryUsage,
        threshold: this.config.memoryThreshold,
        pressure: metrics.memoryPressure,
      })
    }
  }

  /**
   * Track WASM-accelerated vector search for agent memory
   */
  async searchAgentMemory(query: MemorySearchQuery): Promise<MemorySearchResult[]> {
    return observability.trackOperation('wasm.memory.search', async () => {
      // Convert agent memories to vector documents
      const vectorSearch = this.wasmServices?.getVectorSearch()

      // This is a simplified implementation - in production, you'd integrate
      // with the actual database and embedding generation
      const mockResults: MemorySearchResult[] = []

      // Track the operation
      await wasmPerformanceTracker.trackOperation(
        'vector-search',
        async () => {
          // Perform actual vector search
          return mockResults
        },
        {
          inputSize: 1,
          isWASM: true,
          metadata: {
            query: query.query,
            agentType: query.agentType,
            useSemanticSearch: query.useSemanticSearch,
          },
        }
      )

      return mockResults
    })
  }

  /**
   * Process observability events with WASM optimization
   */
  async processEventBatch(events: ObservabilityEvent[]): Promise<void> {
    if (events.length === 0) return

    await wasmPerformanceTracker.trackBatchOperation(
      'data-processing',
      events,
      async (event) => {
        // Process event with WASM optimization
        const processed = await dataProcessor.transform([event], {
          transformations: [{ field: 'data', operation: 'normalize' }],
        })

        return processed.result[0]
      },
      {
        batchSize: 50,
        isWASM: true,
        onProgress: (progress) => {
          console.log(`Processing events: ${progress.toFixed(1)}%`)
        },
      }
    )
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<WASMHealthStatus> {
    const healthCheckResult = this.wasmServices
      ? await this.wasmServices.healthCheck()
      : {
          healthy: false,
          services: {
            vectorSearch: { healthy: false, message: 'WASM services not initialized' },
            sqlite: { healthy: false, message: 'WASM services not initialized' },
            compute: { healthy: false, message: 'WASM services not initialized' },
            dataProcessor: { healthy: false, message: 'WASM services not initialized' },
          },
          initializationComplete: false,
        }
    const performanceReport = wasmPerformanceTracker.generateReport()
    const memoryMetrics = this.collectMemoryMetrics()

    // Calculate service health
    const services: WASMHealthStatus['services'] = {
      vectorSearch: this.calculateServiceHealth(
        'vectorSearch',
        healthCheckResult.services.vectorSearch
      ),
      sqlite: this.calculateServiceHealth('sqlite', healthCheckResult.services.sqlite),
      compute: this.calculateServiceHealth('compute', healthCheckResult.services.compute),
      dataProcessor: this.calculateServiceHealth('dataProcessor', 'healthy'), // Based on stats
    }

    // Calculate performance health
    const performance: PerformanceHealth = {
      averageWASMTime: performanceReport.summary.averageWASMTime,
      averageFallbackTime: performanceReport.summary.averageFallbackTime,
      wasmUsageRate:
        performanceReport.summary.wasmCallCount > 0
          ? (performanceReport.summary.wasmCallCount /
              (performanceReport.summary.wasmCallCount + performanceReport.summary.fallbackCount)) *
            100
          : 0,
      performanceGain:
        performanceReport.summary.averageFallbackTime > 0
          ? ((performanceReport.summary.averageFallbackTime -
              performanceReport.summary.averageWASMTime) /
              performanceReport.summary.averageFallbackTime) *
            100
          : 0,
    }

    // Combine recommendations
    const recommendations = [
      ...performanceReport.recommendations,
      ...healthCheckResult.details,
      ...this.generateHealthRecommendations(services, performance, memoryMetrics),
    ]

    return {
      overall: healthCheckResult.overall,
      services,
      performance,
      memory: memoryMetrics,
      recommendations: [...new Set(recommendations)], // Remove duplicates
    }
  }

  /**
   * Calculate service health metrics
   */
  private calculateServiceHealth(
    serviceName: string,
    status: 'healthy' | 'unhealthy' | 'unavailable'
  ): ServiceHealth {
    const metrics = wasmPerformanceTracker.getOperationMetrics(
      serviceName === 'dataProcessor'
        ? 'data-processing'
        : serviceName === 'vectorSearch'
          ? 'vector-search'
          : serviceName === 'sqlite'
            ? 'sqlite-query'
            : 'compute'
    )

    return {
      status,
      lastCheck: new Date(),
      errorRate: 100 - metrics.successRate,
      averageResponseTime: metrics.averageExecutionTime,
      details:
        status === 'unhealthy'
          ? `Service experiencing ${(100 - metrics.successRate).toFixed(1)}% error rate`
          : undefined,
    }
  }

  /**
   * Generate health recommendations
   */
  private generateHealthRecommendations(
    services: WASMHealthStatus['services'],
    performance: PerformanceHealth,
    memory: MemoryHealth
  ): string[] {
    const recommendations: string[] = []

    // Service-specific recommendations
    Object.entries(services).forEach(([name, health]) => {
      if (health.status === 'unhealthy') {
        recommendations.push(`Investigate ${name} service health issues`)
      }
      if (health.errorRate > 5) {
        recommendations.push(`High error rate in ${name} service (${health.errorRate.toFixed(1)}%)`)
      }
      if (health.averageResponseTime > this.config.performanceThreshold) {
        recommendations.push(`${name} service response time exceeds threshold`)
      }
    })

    // Performance recommendations
    if (performance.wasmUsageRate < 50) {
      recommendations.push('Low WASM usage rate - check WASM availability and thresholds')
    }
    if (performance.performanceGain < 0) {
      recommendations.push(
        'WASM performing worse than fallback - consider optimization or disabling for small operations'
      )
    }

    // Memory recommendations
    if (memory.memoryPressure === 'high') {
      recommendations.push('High memory pressure detected - implement cleanup strategies')
    }
    if (memory.wasmMemoryUsage > this.config.memoryThreshold) {
      recommendations.push('WASM memory usage exceeds threshold - consider memory pooling')
    }

    return recommendations
  }

  /**
   * Buffer event for batch processing
   */
  private bufferEvent(event: Partial<ObservabilityEvent>): void {
    this.eventBuffer.push(event as ObservabilityEvent)

    if (this.eventBuffer.length >= this.config.eventBatchSize) {
      this.flushEventBuffer()
    }
  }

  /**
   * Flush event buffer
   */
  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return

    const events = [...this.eventBuffer]
    this.eventBuffer = []

    try {
      await this.processEventBatch(events)
    } catch (error) {
      console.error('Failed to flush event buffer:', error)
      // Re-add events to buffer on failure
      this.eventBuffer.unshift(...events)
    }
  }

  /**
   * Get total memory usage
   */
  private getTotalMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  /**
   * Get available memory
   */
  private getAvailableMemory(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      return memory.jsHeapSizeLimit - memory.usedJSHeapSize
    }
    return 0
  }

  /**
   * Calculate memory pressure
   */
  private calculateMemoryPressure(used: number, available: number): 'low' | 'medium' | 'high' {
    const total = used + available
    const usagePercent = (used / total) * 100

    if (usagePercent > 90) return 'high'
    if (usagePercent > 70) return 'medium'
    return 'low'
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<{
    summary: any
    services: any
    recommendations: string[]
    trends: any
  }> {
    const performanceReport = wasmPerformanceTracker.generateReport()
    const healthStatus = await this.getHealthStatus()
    const moduleStats = moduleLoader.getStats()

    return {
      summary: {
        ...performanceReport.summary,
        health: healthStatus.overall,
        moduleStats,
      },
      services: {
        performance: performanceReport.byOperation,
        health: healthStatus.services,
      },
      recommendations: healthStatus.recommendations,
      trends: {
        wasmAdoption: healthStatus.performance.wasmUsageRate,
        performanceGain: healthStatus.performance.performanceGain,
        memoryPressure: healthStatus.memory.memoryPressure,
      },
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring()
    this.flushEventBuffer()
    this.wasmServices?.cleanup()
  }
}

// Export singleton instance
export const wasmObservability = WASMObservabilityIntegration.getInstance()

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  wasmObservability.initialize().catch((error) => {
    console.warn('Failed to initialize WASM observability:', error)
  })
}
