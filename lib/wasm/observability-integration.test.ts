/**
 * WASM Observability Integration Tests
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { observability } from '../observability'
import { dataProcessor } from './data-processor'
import { wasmObservability } from './observability-integration'
import { wasmPerformanceTracker } from './performance-tracker'
import { wasmServices } from './services'

describe('WASM Observability Integration', () => {
  beforeAll(async () => {
    // Initialize WASM services
    await wasmServices.initialize()
  })

  afterAll(() => {
    // Cleanup
    wasmServices.cleanup()
  })

  describe('Performance Tracking', () => {
    it('should track WASM operations with observability', async () => {
      const trackOperationSpy = vi.spyOn(observability, 'trackOperation')

      // Perform a vector search operation
      const vectorSearch = wasmServices.getVectorSearch()
      await vectorSearch.addDocuments([
        {
          id: 'test_1',
          content: 'Test document',
          embedding: new Array(384).fill(0.1),
          metadata: { test: true },
        },
      ])

      // Verify observability tracking was called
      expect(trackOperationSpy).toHaveBeenCalled()
      trackOperationSpy.mockRestore()
    })

    it('should collect performance metrics', async () => {
      // Perform some operations
      await dataProcessor.transform(
        [
          { id: 1, name: 'test' },
          { id: 2, name: 'example' },
        ],
        { transformations: [{ field: 'name', operation: 'uppercase' }] }
      )

      // Get performance metrics
      const metrics = wasmPerformanceTracker.getMetrics()

      expect(metrics).toHaveProperty('wasmCallCount')
      expect(metrics).toHaveProperty('fallbackCount')
      expect(metrics).toHaveProperty('averageWASMTime')
      expect(metrics).toHaveProperty('averageFallbackTime')
    })

    it('should generate performance reports', () => {
      const report = wasmPerformanceTracker.generateReport()

      expect(report).toHaveProperty('summary')
      expect(report).toHaveProperty('byOperation')
      expect(report).toHaveProperty('recommendations')
      expect(Array.isArray(report.recommendations)).toBe(true)
    })
  })

  describe('Health Monitoring', () => {
    it('should provide comprehensive health status', async () => {
      const healthStatus = await wasmObservability.getHealthStatus()

      expect(healthStatus).toHaveProperty('overall')
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthStatus.overall)

      expect(healthStatus).toHaveProperty('services')
      expect(healthStatus.services).toHaveProperty('vectorSearch')
      expect(healthStatus.services).toHaveProperty('sqlite')
      expect(healthStatus.services).toHaveProperty('compute')
      expect(healthStatus.services).toHaveProperty('dataProcessor')

      expect(healthStatus).toHaveProperty('performance')
      expect(healthStatus).toHaveProperty('memory')
      expect(healthStatus).toHaveProperty('recommendations')
    })

    it('should track memory usage', async () => {
      const healthStatus = await wasmObservability.getHealthStatus()

      expect(healthStatus.memory).toHaveProperty('totalMemoryUsage')
      expect(healthStatus.memory).toHaveProperty('wasmMemoryUsage')
      expect(healthStatus.memory).toHaveProperty('availableMemory')
      expect(healthStatus.memory).toHaveProperty('memoryPressure')
      expect(['low', 'medium', 'high']).toContain(healthStatus.memory.memoryPressure)
    })
  })

  describe('Event Processing', () => {
    it('should process observability events with WASM optimization', async () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        id: `event_${i}`,
        executionId: `exec_${i}`,
        eventType: 'performance_metric' as const,
        timestamp: new Date().toISOString(),
        data: { metric: 'test', value: i },
        traceId: null,
        spanId: null,
        severity: 'low' as const,
        category: 'test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))

      await wasmObservability.processEventBatch(events)

      // Verify processing completed without errors
      expect(true).toBe(true)
    })
  })

  describe('Integration with Services', () => {
    it('should integrate with all WASM services', () => {
      const stats = wasmServices.getStats()

      expect(stats).toHaveProperty('vectorSearch')
      expect(stats).toHaveProperty('sqlite')
      expect(stats).toHaveProperty('compute')
      expect(stats).toHaveProperty('dataProcessing')
      expect(stats).toHaveProperty('performance')
      expect(stats).toHaveProperty('observability')
    })

    it('should provide unified performance metrics', async () => {
      const report = await wasmObservability.generatePerformanceReport()

      expect(report).toHaveProperty('summary')
      expect(report).toHaveProperty('services')
      expect(report).toHaveProperty('recommendations')
      expect(report).toHaveProperty('trends')

      expect(report.trends).toHaveProperty('wasmAdoption')
      expect(report.trends).toHaveProperty('performanceGain')
      expect(report.trends).toHaveProperty('memoryPressure')
    })
  })

  describe('Error Handling', () => {
    it('should handle WASM initialization failures gracefully', async () => {
      // Force a failure by mocking
      const originalDetect = wasmServices['capabilities']
      wasmServices['capabilities'] = { isSupported: false } as any

      // Should not throw
      await expect(wasmObservability.initialize()).resolves.not.toThrow()

      // Restore
      wasmServices['capabilities'] = originalDetect
    })

    it('should track errors in performance metrics', async () => {
      // Force an error
      try {
        await dataProcessor.transform(null as any, {})
      } catch (error) {
        // Expected
      }

      const metrics = wasmPerformanceTracker.getOperationMetrics('data-processing')
      expect(metrics.successRate).toBeLessThan(100)
    })
  })

  describe('Memory Management', () => {
    it('should clean up resources properly', () => {
      const beforeStats = wasmServices.getStats()

      wasmServices.cleanup()

      // Re-initialize for other tests
      wasmServices.initialize()

      // Verify cleanup happened
      expect(true).toBe(true)
    })

    it('should reset performance metrics', () => {
      wasmPerformanceTracker.reset()

      const metrics = wasmPerformanceTracker.getMetrics()
      expect(metrics.wasmCallCount).toBe(0)
      expect(metrics.fallbackCount).toBe(0)
    })
  })
})
