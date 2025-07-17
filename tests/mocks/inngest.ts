// Inngest Event System Mocking Utilities
// Comprehensive mocking for Inngest event handling and functions

import { vi } from 'vitest'

// Mock event types
export interface MockEvent {
  id: string
  name: string
  data: Record<string, any>
  timestamp: Date
  user?: { id: string; name?: string }
  v?: string
  ts?: number
}

// Mock step context
export interface MockStepContext {
  step: {
    run: vi.MockedFunction<any>
    sleep: vi.MockedFunction<any>
    sleepUntil: vi.MockedFunction<any>
    waitForEvent: vi.MockedFunction<any>
    sendEvent: vi.MockedFunction<any>
    invoke: vi.MockedFunction<any>
  }
}

// Mock function configuration
export interface MockFunctionConfig {
  id: string
  name: string
  concurrency?: number
  retries?: number
  rateLimit?: {
    limit: number
    period: string
  }
}

// Event store for testing
let mockEvents: MockEvent[] = []
let mockFunctionRuns: Array<{
  functionId: string
  event: MockEvent
  result?: any
  error?: Error
  duration?: number
}> = []

// Mock Inngest client
export const mockInngestClient = {
  // Event operations
  send: vi.fn().mockImplementation((event: Partial<MockEvent> | Partial<MockEvent>[]) => {
    const events = Array.isArray(event) ? event : [event]
    
    events.forEach(evt => {
      const mockEvent: MockEvent = {
        id: `evt-${Date.now()}`,
        name: evt.name || 'test.event',
        data: evt.data || {},
        timestamp: new Date(),
        v: '2023-05-15.1',
        ts: Date.now(),
        ...evt,
      }
      mockEvents.push(mockEvent)
    })
    
    return Promise.resolve({ ids: events.map(e => e.id || `evt-${Date.now()}`) })
  }),

  // Function creation
  createFunction: vi.fn().mockImplementation((config: MockFunctionConfig, handler: Function) => {
    const mockFunction = {
      id: config.id,
      name: config.name,
      config,
      handler,
      
      // Mock function execution
      run: vi.fn().mockImplementation(async (event: MockEvent, step: MockStepContext) => {
        const startTime = Date.now()
        
        try {
          const result = await handler(event, step)
          
          mockFunctionRuns.push({
            functionId: config.id,
            event,
            result,
            duration: Date.now() - startTime,
          })
          
          return result
        } catch (error) {
          mockFunctionRuns.push({
            functionId: config.id,
            event,
            error: error as Error,
            duration: Date.now() - startTime,
          })
          throw error
        }
      }),
    }
    
    return mockFunction
  }),

  // Get function runs
  getFunctionRuns: vi.fn().mockImplementation(() => {
    return Promise.resolve(mockFunctionRuns)
  }),

  // Cancel function run
  cancelRun: vi.fn().mockResolvedValue(undefined),
}

// Mock step utilities
export const createMockStepContext = (): MockStepContext => ({
  step: {
    run: vi.fn().mockImplementation(async (id: string, handler: Function) => {
      return await handler()
    }),
    
    sleep: vi.fn().mockImplementation((duration: string | number) => {
      const ms = typeof duration === 'string' ? 
        parseInt(duration.replace(/[^\d]/g, '')) * 1000 : duration
      return new Promise(resolve => setTimeout(resolve, ms))
    }),
    
    sleepUntil: vi.fn().mockImplementation((date: Date | string) => {
      const targetTime = new Date(date).getTime()
      const delay = Math.max(0, targetTime - Date.now())
      return new Promise(resolve => setTimeout(resolve, delay))
    }),
    
    waitForEvent: vi.fn().mockImplementation((eventName: string, options?: { timeout?: string }) => {
      return new Promise((resolve, reject) => {
        const timeout = options?.timeout ? parseInt(options.timeout) * 1000 : 30000
        
        const checkEvent = () => {
          const event = mockEvents.find(e => e.name === eventName)
          if (event) {
            resolve(event)
          } else {
            setTimeout(checkEvent, 100)
          }
        }
        
        checkEvent()
        setTimeout(() => reject(new Error('Event timeout')), timeout)
      })
    }),
    
    sendEvent: vi.fn().mockImplementation((event: Partial<MockEvent>) => {
      return mockInngestClient.send(event)
    }),
    
    invoke: vi.fn().mockImplementation((functionId: string, data?: any) => {
      return Promise.resolve({
        functionId,
        data,
        result: `Mock result for ${functionId}`,
      })
    }),
  },
})

// Test data generators
export const inngestTestDataGenerators = {
  // Generate mock event
  createMockEvent: (overrides: Partial<MockEvent> = {}): MockEvent => ({
    id: `evt-${Date.now()}`,
    name: 'test.event',
    data: { message: 'Test event data' },
    timestamp: new Date(),
    v: '2023-05-15.1',
    ts: Date.now(),
    ...overrides,
  }),

  // Generate task-related events
  createTaskEvent: (taskId: string, action: string, data?: Record<string, any>): MockEvent => ({
    id: `evt-${Date.now()}`,
    name: `task.${action}`,
    data: {
      taskId,
      action,
      ...data,
    },
    timestamp: new Date(),
    v: '2023-05-15.1',
    ts: Date.now(),
  }),

  // Generate environment events
  createEnvironmentEvent: (envId: string, action: string, data?: Record<string, any>): MockEvent => ({
    id: `evt-${Date.now()}`,
    name: `environment.${action}`,
    data: {
      environmentId: envId,
      action,
      ...data,
    },
    timestamp: new Date(),
    v: '2023-05-15.1',
    ts: Date.now(),
  }),

  // Generate function config
  createFunctionConfig: (overrides: Partial<MockFunctionConfig> = {}): MockFunctionConfig => ({
    id: `fn-${Date.now()}`,
    name: 'test-function',
    concurrency: 1,
    retries: 3,
    rateLimit: {
      limit: 10,
      period: '1m',
    },
    ...overrides,
  }),
}

// State management utilities
export const inngestStateUtils = {
  // Reset all mock data
  reset: () => {
    mockEvents = []
    mockFunctionRuns = []
    vi.clearAllMocks()
  },

  // Seed mock data
  seedData: (data: { events?: MockEvent[], runs?: typeof mockFunctionRuns }) => {
    if (data.events) {
      mockEvents = [...data.events]
    }
    if (data.runs) {
      mockFunctionRuns = [...data.runs]
    }
  },

  // Get current state
  getState: () => ({
    events: [...mockEvents],
    runs: [...mockFunctionRuns],
  }),

  // Simulate event processing
  triggerEvent: (eventName: string, data?: Record<string, any>) => {
    const event = inngestTestDataGenerators.createMockEvent({
      name: eventName,
      data,
    })
    mockEvents.push(event)
    return event
  },

  // Wait for event to be processed
  waitForEvent: async (eventName: string, timeout: number = 1000) => {
    return new Promise((resolve, reject) => {
      const checkEvent = () => {
        const event = mockEvents.find(e => e.name === eventName)
        if (event) {
          resolve(event)
        } else {
          setTimeout(checkEvent, 10)
        }
      }
      checkEvent()
      setTimeout(() => reject(new Error('Event timeout')), timeout)
    })
  },

  // Check if function was called
  wasEventSent: (eventName: string): boolean => {
    return mockEvents.some(e => e.name === eventName)
  },

  // Get events by name
  getEventsByName: (eventName: string): MockEvent[] => {
    return mockEvents.filter(e => e.name === eventName)
  },

  // Get function runs by ID
  getFunctionRunsById: (functionId: string) => {
    return mockFunctionRuns.filter(r => r.functionId === functionId)
  },
}

// Setup function to apply Inngest mocks
export const setupInngestMocks = () => {
  vi.mock('inngest', () => ({
    Inngest: vi.fn().mockImplementation(() => mockInngestClient),
    InngestFunction: vi.fn().mockImplementation((config: MockFunctionConfig, handler: Function) => {
      return mockInngestClient.createFunction(config, handler)
    }),
  }))
}

// Test helpers for Inngest testing
export const inngestTestHelpers = {
  // Assert event was sent
  expectEventSent: (eventName: string, data?: Record<string, any>) => {
    expect(mockInngestClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: eventName,
        ...(data && { data: expect.objectContaining(data) }),
      })
    )
  },

  // Assert function was called
  expectFunctionCalled: (functionId: string, eventName?: string) => {
    const runs = mockFunctionRuns.filter(r => r.functionId === functionId)
    expect(runs.length).toBeGreaterThan(0)
    
    if (eventName) {
      expect(runs.some(r => r.event.name === eventName)).toBe(true)
    }
  },

  // Assert step was executed
  expectStepRun: (stepId: string) => {
    const stepContext = createMockStepContext()
    expect(stepContext.step.run).toHaveBeenCalledWith(
      stepId,
      expect.any(Function)
    )
  },

  // Mock step execution
  mockStepExecution: (stepId: string, result: any) => {
    const stepContext = createMockStepContext()
    stepContext.step.run.mockImplementation(async (id: string, handler: Function) => {
      if (id === stepId) {
        return result
      }
      return handler()
    })
    return stepContext
  },

  // Simulate step failure
  mockStepFailure: (stepId: string, error: Error) => {
    const stepContext = createMockStepContext()
    stepContext.step.run.mockImplementation(async (id: string, handler: Function) => {
      if (id === stepId) {
        throw error
      }
      return handler()
    })
    return stepContext
  },

  // Wait for all pending events
  waitForAllEvents: async (timeout: number = 1000) => {
    return new Promise((resolve) => {
      setTimeout(resolve, timeout)
    })
  },
}

// Export setup function for easy integration
export const setupInngestSystemMocks = () => {
  setupInngestMocks()
  inngestStateUtils.reset()
}

// Cleanup function
export const cleanupInngestMocks = () => {
  inngestStateUtils.reset()
  vi.clearAllMocks()
}