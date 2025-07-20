/**
 * Mock Observability Service for Testing
 */

export const mockObservability = {
  database: {
    recordQuery: vi.fn(),
    recordError: vi.fn(),
    getMetrics: vi.fn().mockReturnValue({
      totalQueries: 0,
      avgDuration: 0,
      errorCount: 0,
    }),
    getQueryStats: vi.fn().mockReturnValue({}),
    getErrorStats: vi.fn().mockReturnValue({
      total: 0,
      byType: {},
    }),
    getTransactionStats: vi.fn().mockReturnValue({
      total: 0,
      successful: 0,
      failed: 0,
      avgDuration: 0,
    }),
    onSlowQuery: vi.fn(),
    startTransaction: vi.fn(),
    endTransaction: vi.fn(),
    updateConnectionPool: vi.fn(),
    updateHealth: vi.fn(),
  },
  api: {
    recordExternalCall: vi.fn(),
    recordError: vi.fn(),
  },
  performance: {
    recordMetric: vi.fn(),
  },
  trackOperation: vi.fn().mockImplementation(async (name, fn) => {
    return await fn()
  }),
  trackOperationSync: vi.fn().mockImplementation((name, fn) => {
    return fn()
  }),
  recordEvent: vi.fn(),
  recordError: vi.fn(),
  trackAgentExecution: vi.fn().mockImplementation(async (agentId, fn) => {
    return await fn()
  }),
  getEvents: vi.fn().mockReturnValue([]),
  getErrors: vi.fn().mockReturnValue([]),
  getOperationStats: vi.fn().mockReturnValue({}),
  clear: vi.fn(),
  getHealthStatus: vi.fn().mockReturnValue({
    status: 'healthy',
    uptime: 1000,
    totalOperations: 0,
    totalErrors: 0,
    recentErrorRate: 0,
    averageResponseTime: 0,
    lastActivity: Date.now(),
  }),
}

// For Bun tests without vitest
export const bunMockObservability = {
  database: {
    recordQuery: () => {},
    recordError: () => {},
    getMetrics: () => ({
      totalQueries: 0,
      avgDuration: 0,
      errorCount: 0,
    }),
    getQueryStats: () => ({}),
    getErrorStats: () => ({
      total: 0,
      byType: {},
    }),
    getTransactionStats: () => ({
      total: 0,
      successful: 0,
      failed: 0,
      avgDuration: 0,
    }),
    onSlowQuery: () => {},
    startTransaction: () => {},
    endTransaction: () => {},
    updateConnectionPool: () => {},
    updateHealth: () => {},
  },
  api: {
    recordExternalCall: () => {},
    recordError: () => {},
  },
  performance: {
    recordMetric: () => {},
  },
  trackOperation: async (name: string, fn: Function) => {
    return await fn()
  },
  trackOperationSync: (name: string, fn: Function) => {
    return fn()
  },
  recordEvent: () => {},
  recordError: () => {},
  trackAgentExecution: async (agentId: string, fn: Function) => {
    return await fn()
  },
  getEvents: () => [],
  getErrors: () => [],
  getOperationStats: () => ({}),
  clear: () => {},
  getHealthStatus: () => ({
    status: 'healthy',
    uptime: 1000,
    totalOperations: 0,
    totalErrors: 0,
    recentErrorRate: 0,
    averageResponseTime: 0,
    lastActivity: Date.now(),
  }),
}