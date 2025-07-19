/**
 * WASM Performance Tracker
 *
 * This module provides comprehensive performance tracking for WASM services
 * integrated with the observability infrastructure.
 */

import { observability } from '../observability'
import type { PerformanceMetrics } from '../observability/types'

export interface WASMPerformanceMetrics extends PerformanceMetrics {
  wasmEnabled: boolean
  wasmInitTime: number
  wasmMemoryUsage: number
  wasmCallCount: number
  fallbackCount: number
  averageWASMTime: number
  averageFallbackTime: number
}

export interface WASMOperationMetrics {
  operationType: 'vector-search' | 'sqlite-query' | 'compute' | 'data-processing'
  startTime: number
  endTime?: number
  memoryBefore: number
  memoryAfter?: number
  inputSize: number
  outputSize?: number
  isWASM: boolean
  error?: Error
}

export class WASMPerformanceTracker {
  private static instance: WASMPerformanceTracker
  private operationMetrics: Map<string, WASMOperationMetrics[]> = new Map()
  private wasmCalls = 0
  private fallbackCalls = 0
  private totalWASMTime = 0
  private totalFallbackTime = 0
  private initializationTimes: Map<string, number> = new Map()

  static getInstance(): WASMPerformanceTracker {
    if (!WASMPerformanceTracker.instance) {
      WASMPerformanceTracker.instance = new WASMPerformanceTracker()
    }
    return WASMPerformanceTracker.instance
  }

  /**
   * Track WASM service initialization
   */
  async trackInitialization(service: string, initialization: () => Promise<void>): Promise<void> {
    const startTime = performance.now()

    try {
      await observability.trackOperation(`wasm.${service}.initialize`, async () => {
        await initialization()

        const initTime = performance.now() - startTime
        this.initializationTimes.set(service, initTime)

        observability.recordEvent('wasm.initialization.complete', {
          service,
          initTime,
          success: true,
        })
      })
    } catch (error) {
      const initTime = performance.now() - startTime
      this.initializationTimes.set(service, initTime)

      observability.recordEvent('wasm.initialization.failed', {
        service,
        initTime,
        error: (error as Error).message,
      })

      throw error
    }
  }

  /**
   * Track WASM operation with comprehensive metrics
   */
  async trackOperation<T>(
    operationType: WASMOperationMetrics['operationType'],
    operation: () => Promise<T>,
    options: {
      inputSize: number
      isWASM: boolean
      metadata?: Record<string, any>
    }
  ): Promise<T> {
    const operationId = `${operationType}_${Date.now()}_${Math.random()}`
    const startTime = performance.now()
    const memoryBefore = this.getMemoryUsage()

    const metrics: WASMOperationMetrics = {
      operationType,
      startTime,
      memoryBefore,
      inputSize: options.inputSize,
      isWASM: options.isWASM,
    }

    // Add to current operation metrics
    if (!this.operationMetrics.has(operationType)) {
      this.operationMetrics.set(operationType, [])
    }

    try {
      const result = await observability.trackOperation(`wasm.${operationType}`, async () => {
        const output = await operation()

        // Update metrics
        metrics.endTime = performance.now()
        metrics.memoryAfter = this.getMemoryUsage()
        metrics.outputSize = this.estimateOutputSize(output)

        // Track totals
        if (options.isWASM) {
          this.wasmCalls++
          this.totalWASMTime += metrics.endTime - startTime
        } else {
          this.fallbackCalls++
          this.totalFallbackTime += metrics.endTime - startTime
        }

        // Record performance event
        observability.recordEvent('wasm.operation.complete', {
          operationType,
          duration: metrics.endTime - startTime,
          memoryDelta: metrics.memoryAfter! - metrics.memoryBefore,
          isWASM: options.isWASM,
          inputSize: options.inputSize,
          outputSize: metrics.outputSize,
          ...options.metadata,
        })

        return output
      })

      // Store metrics
      this.operationMetrics.get(operationType)!.push(metrics)
      this.cleanupOldMetrics(operationType)

      return result
    } catch (error) {
      metrics.error = error as Error
      metrics.endTime = performance.now()
      metrics.memoryAfter = this.getMemoryUsage()

      this.operationMetrics.get(operationType)!.push(metrics)

      observability.recordEvent('wasm.operation.failed', {
        operationType,
        duration: metrics.endTime - startTime,
        isWASM: options.isWASM,
        error: (error as Error).message,
      })

      throw error
    }
  }

  /**
   * Track batch operations with progress reporting
   */
  async trackBatchOperation<T>(
    operationType: WASMOperationMetrics['operationType'],
    items: T[],
    processor: (item: T, index: number) => Promise<any>,
    options: {
      batchSize: number
      isWASM: boolean
      onProgress?: (progress: number) => void
    }
  ): Promise<void> {
    const totalItems = items.length
    let processedItems = 0
    const startTime = performance.now()

    await observability.trackOperation(`wasm.${operationType}.batch`, async () => {
      for (let i = 0; i < items.length; i += options.batchSize) {
        const batch = items.slice(i, i + options.batchSize)

        await Promise.all(
          batch.map(async (item, index) => {
            await this.trackOperation(operationType, () => processor(item, i + index), {
              inputSize: 1,
              isWASM: options.isWASM,
              metadata: {
                batchIndex: Math.floor(i / options.batchSize),
                itemIndex: i + index,
              },
            })

            processedItems++
            const progress = (processedItems / totalItems) * 100
            options.onProgress?.(progress)
          })
        )
      }

      const totalTime = performance.now() - startTime
      observability.recordEvent('wasm.batch.complete', {
        operationType,
        totalItems,
        batchSize: options.batchSize,
        totalTime,
        averageTimePerItem: totalTime / totalItems,
        isWASM: options.isWASM,
      })
    })
  }

  /**
   * Get comprehensive performance metrics
   */
  getMetrics(): WASMPerformanceMetrics {
    const totalCalls = this.wasmCalls + this.fallbackCalls

    return {
      wasmEnabled: this.wasmCalls > 0,
      wasmInitTime: this.getTotalInitTime(),
      wasmMemoryUsage: this.getMemoryUsage(),
      wasmCallCount: this.wasmCalls,
      fallbackCount: this.fallbackCalls,
      averageWASMTime: this.wasmCalls > 0 ? this.totalWASMTime / this.wasmCalls : 0,
      averageFallbackTime: this.fallbackCalls > 0 ? this.totalFallbackTime / this.fallbackCalls : 0,
      // Standard PerformanceMetrics fields
      executionTime: (this.totalWASMTime + this.totalFallbackTime) / totalCalls,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: 0, // Would need actual CPU monitoring
      tokenCount: 0, // N/A for WASM
      apiCalls: totalCalls,
      cacheHits: 0, // Implement cache tracking if needed
      cacheMisses: 0,
    }
  }

  /**
   * Get operation-specific metrics
   */
  getOperationMetrics(operationType: WASMOperationMetrics['operationType']): {
    totalOperations: number
    wasmOperations: number
    fallbackOperations: number
    averageExecutionTime: number
    averageMemoryDelta: number
    successRate: number
    performanceGain: number
  } {
    const metrics = this.operationMetrics.get(operationType) || []

    const wasmOps = metrics.filter((m) => m.isWASM && m.endTime)
    const fallbackOps = metrics.filter((m) => !m.isWASM && m.endTime)
    const successfulOps = metrics.filter((m) => !m.error && m.endTime)

    const avgWASMTime =
      wasmOps.length > 0
        ? wasmOps.reduce((sum, m) => sum + (m.endTime! - m.startTime), 0) / wasmOps.length
        : 0

    const avgFallbackTime =
      fallbackOps.length > 0
        ? fallbackOps.reduce((sum, m) => sum + (m.endTime! - m.startTime), 0) / fallbackOps.length
        : 0

    const avgMemoryDelta =
      successfulOps.length > 0
        ? successfulOps.reduce((sum, m) => sum + ((m.memoryAfter || 0) - m.memoryBefore), 0) /
          successfulOps.length
        : 0

    return {
      totalOperations: metrics.length,
      wasmOperations: wasmOps.length,
      fallbackOperations: fallbackOps.length,
      averageExecutionTime:
        successfulOps.length > 0
          ? successfulOps.reduce((sum, m) => sum + (m.endTime! - m.startTime), 0) /
            successfulOps.length
          : 0,
      averageMemoryDelta: avgMemoryDelta,
      successRate: metrics.length > 0 ? (successfulOps.length / metrics.length) * 100 : 0,
      performanceGain:
        avgFallbackTime > 0 ? ((avgFallbackTime - avgWASMTime) / avgFallbackTime) * 100 : 0,
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: WASMPerformanceMetrics
    byOperation: Record<string, ReturnType<typeof this.getOperationMetrics>>
    recommendations: string[]
  } {
    const summary = this.getMetrics()
    const byOperation: Record<string, ReturnType<typeof this.getOperationMetrics>> = {}

    for (const [operation] of this.operationMetrics) {
      byOperation[operation] = this.getOperationMetrics(operation as any)
    }

    const recommendations = this.generateRecommendations(summary, byOperation)

    return {
      summary,
      byOperation,
      recommendations,
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    summary: WASMPerformanceMetrics,
    byOperation: Record<string, ReturnType<typeof this.getOperationMetrics>>
  ): string[] {
    const recommendations: string[] = []

    // Check WASM vs fallback performance
    if (summary.averageFallbackTime < summary.averageWASMTime) {
      recommendations.push(
        'WASM performance is slower than JavaScript fallback. Consider optimizing WASM modules or using fallback for small operations.'
      )
    }

    // Check memory usage
    if (summary.wasmMemoryUsage > 100 * 1024 * 1024) {
      // 100MB
      recommendations.push(
        'High WASM memory usage detected. Consider implementing memory pooling or cleanup strategies.'
      )
    }

    // Check operation-specific performance
    for (const [operation, metrics] of Object.entries(byOperation)) {
      if (metrics.performanceGain < 10 && metrics.wasmOperations > 0) {
        recommendations.push(
          `Low performance gain for ${operation}. Consider using JavaScript fallback for this operation type.`
        )
      }

      if (metrics.successRate < 95) {
        recommendations.push(
          `High error rate for ${operation} (${(100 - metrics.successRate).toFixed(1)}%). Investigate stability issues.`
        )
      }
    }

    // Check initialization time
    if (summary.wasmInitTime > 1000) {
      // 1 second
      recommendations.push(
        'Slow WASM initialization detected. Consider lazy loading or optimizing module size.'
      )
    }

    return recommendations
  }

  /**
   * Get memory usage (simplified)
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  /**
   * Estimate output size
   */
  private estimateOutputSize(output: any): number {
    try {
      return JSON.stringify(output).length
    } catch {
      return 0
    }
  }

  /**
   * Get total initialization time
   */
  private getTotalInitTime(): number {
    return Array.from(this.initializationTimes.values()).reduce((sum, time) => sum + time, 0)
  }

  /**
   * Cleanup old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(operationType: string): void {
    const metrics = this.operationMetrics.get(operationType)
    if (metrics && metrics.length > 1000) {
      // Keep only last 1000 metrics
      this.operationMetrics.set(operationType, metrics.slice(-1000))
    }
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.operationMetrics.clear()
    this.wasmCalls = 0
    this.fallbackCalls = 0
    this.totalWASMTime = 0
    this.totalFallbackTime = 0
    this.initializationTimes.clear()
  }
}

// Export singleton instance
export const wasmPerformanceTracker = WASMPerformanceTracker.getInstance()
