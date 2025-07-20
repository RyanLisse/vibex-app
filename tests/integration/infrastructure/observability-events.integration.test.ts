/**
 * Integration Tests for Observability Events System
 *
 * Tests end-to-end workflows for event collection, storage, querying,
 * and OpenTelemetry integration.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { ulid } from 'ulid'
import { db } from '@/db/config'
import { observabilityEvents as observabilityEventsTable } from '@/db/schema'
import {
  ObservabilityEventCollector,
  ObservabilityEventQuery,
  observabilityEvents,
  type ObservabilityEventType,
  type EventSeverity,
  type EventMetadata,
} from '@/lib/observability/events'
import { trace, SpanKind, context } from '@opentelemetry/api'

// Mock OpenTelemetry
vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn(() => ({
      startSpan: vi.fn(() => ({
        end: vi.fn(),
        setStatus: vi.fn(),
        spanContext: () => ({
          traceId: 'mock-trace-id',
          spanId: 'mock-span-id',
        }),
      })),
    })),
    getActiveSpan: vi.fn(() => ({
      spanContext: () => ({
        traceId: 'mock-trace-id',
        spanId: 'mock-span-id',
      }),
    })),
  },
  SpanKind: {
    INTERNAL: 0,
  },
  SpanStatusCode: {
    ERROR: 2,
  },
  context: {
    active: vi.fn(),
  },
}))

describe('ObservabilityEventCollector Integration Tests', () => {
  let collector: ObservabilityEventCollector

  beforeEach(async () => {
    // Clear database
    await db.delete(observabilityEventsTable)

    // Get fresh instance
    collector = ObservabilityEventCollector.getInstance()

    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Stop periodic flush
    collector.stopPeriodicFlush()
  })

  describe('Event Collection and Storage', () => {
    it('should collect and store events in database', async () => {
      // Collect multiple events
      await collector.collectEvent(
        'execution_start',
        'info',
        'Test execution started',
        { executionId: 'exec-123' },
        'test-source',
        ['test', 'integration']
      )

      await collector.collectEvent(
        'execution_end',
        'info',
        'Test execution completed',
        { executionId: 'exec-123', duration: 1500 },
        'test-source',
        ['test', 'integration']
      )

      // Force flush to database
      await collector.forceFlush()

      // Verify events in database
      const events = await db.select().from(observabilityEventsTable)
      expect(events).toHaveLength(2)

      const startEvent = events.find((e) => e.type === 'execution_start')
      expect(startEvent).toBeDefined()
      expect(startEvent?.severity).toBe('info')
      expect(startEvent?.message).toBe('Test execution started')
      expect(startEvent?.source).toBe('test-source')
      expect(startEvent?.tags).toEqual(['test', 'integration'])
      expect(startEvent?.metadata?.executionId).toBe('exec-123')

      const endEvent = events.find((e) => e.type === 'execution_end')
      expect(endEvent).toBeDefined()
      expect(endEvent?.metadata?.duration).toBe(1500)
    })

    it('should handle batch event collection with automatic flush', async () => {
      const BUFFER_SIZE = 100
      const events = []

      // Generate events to fill buffer
      for (let i = 0; i < BUFFER_SIZE + 10; i++) {
        events.push(
          collector.collectEvent(
            'performance_metric',
            'debug',
            `Metric ${i}`,
            { value: i, metric: 'test_metric' },
            'batch-test',
            ['batch']
          )
        )
      }

      await Promise.all(events)

      // Should have auto-flushed when buffer was full
      const storedEvents = await db.select().from(observabilityEventsTable)
      expect(storedEvents.length).toBeGreaterThanOrEqual(BUFFER_SIZE)
    })

    it('should preserve event metadata and OpenTelemetry context', async () => {
      const metadata: EventMetadata = {
        executionId: 'exec-456',
        stepId: 'step-123',
        userId: 'user-789',
        sessionId: 'session-abc',
        duration: 2500,
        memoryUsage: 1024 * 1024,
        cpuUsage: 45.5,
        networkLatency: 120,
        wasmPerformance: {
          initTime: 50,
          executionTime: 200,
          memoryUsage: 512 * 1024,
        },
        queryMetrics: {
          queryTime: 35,
          rowsAffected: 10,
          cacheHit: true,
        },
        customField: 'custom-value',
      }

      await collector.collectEvent(
        'wasm_operation',
        'debug',
        'WASM operation completed',
        metadata,
        'wasm',
        ['performance', 'wasm']
      )

      await collector.forceFlush()

      const events = await db.select().from(observabilityEventsTable)
      expect(events).toHaveLength(1)

      const event = events[0]
      expect(event.metadata).toMatchObject(metadata)
      expect(event.traceId).toBe('mock-trace-id')
      expect(event.spanId).toBe('mock-span-id')
    })

    it('should handle errors during flush gracefully', async () => {
      // Mock database error
      const originalInsert = db.insert
      const mockInsert = vi.fn().mockRejectedValueOnce(new Error('Database error'))
      db.insert = mockInsert as any

      // Collect event
      await collector.collectEvent('system_event', 'warn', 'Test warning', {}, 'error-test')

      // Try to flush - should handle error
      await collector.forceFlush()

      // Restore original
      db.insert = originalInsert

      // Event should be retried on next flush
      await collector.forceFlush()

      const events = await db.select().from(observabilityEventsTable)
      expect(events).toHaveLength(1)
    })
  })

  describe('Convenience Event Functions', () => {
    it('should create execution lifecycle events correctly', async () => {
      const executionId = ulid()

      await observabilityEvents.executionStart(executionId, { agentType: 'test-agent' })
      await observabilityEvents.executionEnd(executionId, 3000, { result: 'success' })

      await collector.forceFlush()

      const events = await db.select().from(observabilityEventsTable)
      expect(events).toHaveLength(2)

      const startEvent = events.find((e) => e.type === 'execution_start')
      expect(startEvent?.metadata?.executionId).toBe(executionId)
      expect(startEvent?.metadata?.agentType).toBe('test-agent')

      const endEvent = events.find((e) => e.type === 'execution_end')
      expect(endEvent?.metadata?.duration).toBe(3000)
      expect(endEvent?.metadata?.result).toBe('success')
    })

    it('should create error events with full error details', async () => {
      const executionId = ulid()
      const error = new Error('Test error message')
      error.stack = 'Error: Test error message\n    at test.js:10:5'

      await observabilityEvents.executionError(executionId, error, {
        context: 'test-context',
      })

      await collector.forceFlush()

      const events = await db.select().from(observabilityEventsTable)
      expect(events).toHaveLength(1)

      const errorEvent = events[0]
      expect(errorEvent.severity).toBe('error')
      expect(errorEvent.metadata?.errorDetails).toMatchObject({
        code: 'Error',
        message: 'Test error message',
        stack: error.stack,
      })
      expect(errorEvent.metadata?.context).toBe('test-context')
    })

    it('should create performance metric events', async () => {
      await observabilityEvents.performanceMetric('response_time', 125.5, {
        endpoint: '/api/test',
        method: 'GET',
      })

      await collector.forceFlush()

      const events = await db.select().from(observabilityEventsTable)
      expect(events).toHaveLength(1)

      const metric = events[0]
      expect(metric.type).toBe('performance_metric')
      expect(metric.metadata?.response_time).toBe(125.5)
      expect(metric.metadata?.endpoint).toBe('/api/test')
      expect(metric.tags).toContain('performance')
      expect(metric.tags).toContain('response_time')
    })

    it('should create WASM operation events', async () => {
      const wasmPerf = {
        initTime: 100,
        executionTime: 250,
        memoryUsage: 2048 * 1024,
      }

      await observabilityEvents.wasmOperation('vector_search', wasmPerf, {
        resultCount: 50,
      })

      await collector.forceFlush()

      const events = await db.select().from(observabilityEventsTable)
      expect(events).toHaveLength(1)

      const wasmEvent = events[0]
      expect(wasmEvent.type).toBe('wasm_operation')
      expect(wasmEvent.source).toBe('wasm')
      expect(wasmEvent.metadata?.wasmPerformance).toMatchObject(wasmPerf)
      expect(wasmEvent.metadata?.resultCount).toBe(50)
      expect(wasmEvent.tags).toContain('vector_search')
    })
  })

  describe('OpenTelemetry Integration', () => {
    it('should send events to OpenTelemetry with correct attributes', async () => {
      const mockTracer = trace.getTracer('test')
      const mockSpan = mockTracer.startSpan('test')

      await collector.collectEvent(
        'step_start',
        'info',
        'Processing step',
        { stepName: 'data-transform', stepIndex: 3 },
        'workflow',
        ['step', 'transform']
      )

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'event.step_start',
        expect.objectContaining({
          kind: SpanKind.INTERNAL,
          attributes: expect.objectContaining({
            'event.type': 'step_start',
            'event.severity': 'info',
            'event.source': 'workflow',
            'event.message': 'Processing step',
            'event.tags': 'step,transform',
            'event.metadata.stepName': 'data-transform',
            'event.metadata.stepIndex': 3,
          }),
        })
      )
    })

    it('should set error status for error events', async () => {
      const mockTracer = trace.getTracer('test')
      const mockSpan = mockTracer.startSpan('test')

      await collector.collectEvent(
        'execution_error',
        'critical',
        'Critical system failure',
        {},
        'system'
      )

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: 2, // SpanStatusCode.ERROR
        message: 'Critical system failure',
      })
    })
  })
})

describe('ObservabilityEventQuery Integration Tests', () => {
  beforeEach(async () => {
    // Clear database and seed test data
    await db.delete(observabilityEventsTable)

    const testEvents = [
      {
        id: ulid(),
        type: 'execution_start' as const,
        severity: 'info' as const,
        message: 'Execution 1 started',
        metadata: { executionId: 'exec-1' },
        timestamp: new Date('2024-01-01T10:00:00Z'),
        source: 'agent',
        tags: ['execution'],
        executionId: 'exec-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        data: { executionId: 'exec-1' },
        category: 'agent',
      },
      {
        id: ulid(),
        type: 'execution_error' as const,
        severity: 'error' as const,
        message: 'Execution 1 failed',
        metadata: { executionId: 'exec-1', error: 'Timeout' },
        timestamp: new Date('2024-01-01T10:05:00Z'),
        source: 'agent',
        tags: ['execution', 'error'],
        executionId: 'exec-1',
        traceId: 'trace-1',
        spanId: 'span-2',
        data: { executionId: 'exec-1', error: 'Timeout' },
        category: 'agent',
      },
      {
        id: ulid(),
        type: 'performance_metric' as const,
        severity: 'debug' as const,
        message: 'Query performance',
        metadata: { queryTime: 150, queryType: 'select' },
        timestamp: new Date('2024-01-01T11:00:00Z'),
        source: 'database',
        tags: ['performance', 'database'],
        executionId: null,
        traceId: 'trace-2',
        spanId: 'span-3',
        data: { queryTime: 150, queryType: 'select' },
        category: 'database',
      },
    ]

    await db.insert(observabilityEventsTable).values(testEvents)
  })

  describe('Event Querying', () => {
    it('should query events by execution ID', async () => {
      const events = await ObservabilityEventQuery.getEventsByExecution('exec-1')

      expect(events).toHaveLength(2)
      expect(events.every((e) => e.metadata.executionId === 'exec-1')).toBe(true)
      expect(events[0].timestamp.getTime()).toBeGreaterThan(events[1].timestamp.getTime())
    })

    it('should query events by type and time range', async () => {
      const events = await ObservabilityEventQuery.getEventsByTypeAndTimeRange(
        ['execution_start', 'execution_error'],
        new Date('2024-01-01T09:00:00Z'),
        new Date('2024-01-01T11:00:00Z'),
        10
      )

      expect(events).toHaveLength(2)
      expect(
        events.every((e) => e.type === 'execution_start' || e.type === 'execution_error')
      ).toBe(true)
    })

    it('should query events by severity levels', async () => {
      const errorEvents = await ObservabilityEventQuery.getEventsBySeverity(['error', 'critical'])
      expect(errorEvents).toHaveLength(1)
      expect(errorEvents[0].severity).toBe('error')

      const infoEvents = await ObservabilityEventQuery.getEventsBySeverity(['info', 'debug'])
      expect(infoEvents).toHaveLength(2)
    })

    it('should get recent events with limit', async () => {
      const recentEvents = await ObservabilityEventQuery.getRecentEvents(2)

      expect(recentEvents).toHaveLength(2)
      expect(recentEvents[0].type).toBe('performance_metric')
      expect(recentEvents[1].type).toBe('execution_error')
    })
  })

  describe('Complex Query Scenarios', () => {
    it('should handle empty result sets gracefully', async () => {
      const events = await ObservabilityEventQuery.getEventsByExecution('non-existent')
      expect(events).toHaveLength(0)
    })

    it('should respect query limits', async () => {
      // Add many events
      const manyEvents = Array.from({ length: 50 }, (_, i) => ({
        id: ulid(),
        type: 'system_event' as const,
        severity: 'info' as const,
        message: `Event ${i}`,
        metadata: {},
        timestamp: new Date(Date.now() - i * 1000),
        source: 'system',
        tags: [],
        executionId: null,
        traceId: null,
        spanId: null,
        data: {},
        category: 'system',
      }))

      await db.insert(observabilityEventsTable).values(manyEvents)

      const limitedEvents = await ObservabilityEventQuery.getRecentEvents(10)
      expect(limitedEvents).toHaveLength(10)
    })
  })
})

describe('Concurrent Event Collection', () => {
  it('should handle concurrent event collection without data loss', async () => {
    const collector = ObservabilityEventCollector.getInstance()
    const concurrentCount = 100
    const events = []

    // Collect many events concurrently
    for (let i = 0; i < concurrentCount; i++) {
      events.push(
        collector.collectEvent(
          'system_event',
          'info',
          `Concurrent event ${i}`,
          { index: i },
          'concurrent-test'
        )
      )
    }

    await Promise.all(events)
    await collector.forceFlush()

    const storedEvents = await db.select().from(observabilityEventsTable)
    const concurrentEvents = storedEvents.filter((e) => e.source === 'concurrent-test')

    expect(concurrentEvents).toHaveLength(concurrentCount)

    // Verify all indices are present
    const indices = concurrentEvents.map((e) => e.metadata?.index).sort((a, b) => a - b)
    expect(indices).toEqual(Array.from({ length: concurrentCount }, (_, i) => i))
  })
})

describe('Error Handling and Recovery', () => {
  it('should continue operation after database errors', async () => {
    const collector = ObservabilityEventCollector.getInstance()
    const originalInsert = db.insert

    // Mock intermittent database errors
    let errorCount = 0
    db.insert = vi.fn().mockImplementation((...args) => {
      if (errorCount++ < 2) {
        throw new Error('Database connection lost')
      }
      return originalInsert.apply(db, args)
    })

    // Collect events during errors
    await collector.collectEvent('system_event', 'error', 'Event during error 1')
    await collector.collectEvent('system_event', 'error', 'Event during error 2')

    // Restore database
    db.insert = originalInsert

    // Collect more events
    await collector.collectEvent('system_event', 'info', 'Event after recovery')

    await collector.forceFlush()

    // All events should eventually be stored
    const events = await db.select().from(observabilityEventsTable)
    expect(events.length).toBeGreaterThanOrEqual(3)
  })
})
