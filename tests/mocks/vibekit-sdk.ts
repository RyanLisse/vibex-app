// VibeKit SDK Mocking Utilities
// Comprehensive mocking for VibeKit SDK operations

import { vi } from 'vitest'

// Mock task data types
export interface MockTask {
  id: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  repository?: string
  environment?: string
  createdAt: Date
  updatedAt: Date
  messages?: MockMessage[]
}

export interface MockMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  metadata?: Record<string, any>
}

export interface MockEnvironment {
  id: string
  name: string
  status: 'active' | 'inactive' | 'creating' | 'error'
  repository?: string
  branch?: string
  createdAt: Date
}

// Mock data stores
let mockTasks: MockTask[] = []
let mockEnvironments: MockEnvironment[] = []

// VibeKit SDK mock implementation
export const mockVibeKitSDK = {
  // Task operations
  tasks: {
    create: vi.fn().mockImplementation((taskData: Partial<MockTask>) => {
      const task: MockTask = {
        id: `task-${Date.now()}`,
        description: taskData.description || 'Test task',
        status: 'pending',
        repository: taskData.repository,
        environment: taskData.environment,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
        ...taskData,
      }
      mockTasks.push(task)
      return Promise.resolve(task)
    }),

    get: vi.fn().mockImplementation((id: string) => {
      const task = mockTasks.find((t) => t.id === id)
      return task ? Promise.resolve(task) : Promise.reject(new Error('Task not found'))
    }),

    list: vi.fn().mockImplementation(() => {
      return Promise.resolve(mockTasks)
    }),

    update: vi.fn().mockImplementation((id: string, updates: Partial<MockTask>) => {
      const taskIndex = mockTasks.findIndex((t) => t.id === id)
      if (taskIndex === -1) {
        return Promise.reject(new Error('Task not found'))
      }

      mockTasks[taskIndex] = {
        ...mockTasks[taskIndex],
        ...updates,
        updatedAt: new Date(),
      }
      return Promise.resolve(mockTasks[taskIndex])
    }),

    delete: vi.fn().mockImplementation((id: string) => {
      const taskIndex = mockTasks.findIndex((t) => t.id === id)
      if (taskIndex === -1) {
        return Promise.reject(new Error('Task not found'))
      }

      mockTasks.splice(taskIndex, 1)
      return Promise.resolve()
    }),

    // Message operations
    addMessage: vi.fn().mockImplementation((taskId: string, messageData: Partial<MockMessage>) => {
      const task = mockTasks.find((t) => t.id === taskId)
      if (!task) {
        return Promise.reject(new Error('Task not found'))
      }

      const message: MockMessage = {
        id: `msg-${Date.now()}`,
        content: messageData.content || 'Test message',
        role: messageData.role || 'user',
        timestamp: new Date(),
        metadata: messageData.metadata,
        ...messageData,
      }

      if (!task.messages) {
        task.messages = []
      }
      task.messages.push(message)

      return Promise.resolve(message)
    }),

    getMessages: vi.fn().mockImplementation((taskId: string) => {
      const task = mockTasks.find((t) => t.id === taskId)
      return task
        ? Promise.resolve(task.messages || [])
        : Promise.reject(new Error('Task not found'))
    }),
  },

  // Environment operations
  environments: {
    create: vi.fn().mockImplementation((envData: Partial<MockEnvironment>) => {
      const environment: MockEnvironment = {
        id: `env-${Date.now()}`,
        name: envData.name || 'Test Environment',
        status: 'creating',
        repository: envData.repository,
        branch: envData.branch || 'main',
        createdAt: new Date(),
        ...envData,
      }
      mockEnvironments.push(environment)

      // Simulate async creation
      setTimeout(() => {
        environment.status = 'active'
      }, 100)

      return Promise.resolve(environment)
    }),

    get: vi.fn().mockImplementation((id: string) => {
      const env = mockEnvironments.find((e) => e.id === id)
      return env ? Promise.resolve(env) : Promise.reject(new Error('Environment not found'))
    }),

    list: vi.fn().mockImplementation(() => {
      return Promise.resolve(mockEnvironments)
    }),

    delete: vi.fn().mockImplementation((id: string) => {
      const envIndex = mockEnvironments.findIndex((e) => e.id === id)
      if (envIndex === -1) {
        return Promise.reject(new Error('Environment not found'))
      }

      mockEnvironments.splice(envIndex, 1)
      return Promise.resolve()
    }),
  },

  // GitHub integration
  github: {
    getRepositories: vi.fn().mockResolvedValue([
      { id: 1, name: 'test-repo', full_name: 'user/test-repo' },
      { id: 2, name: 'another-repo', full_name: 'user/another-repo' },
    ]),

    getBranches: vi.fn().mockResolvedValue([
      { name: 'main', commit: { sha: 'abc123' } },
      { name: 'develop', commit: { sha: 'def456' } },
    ]),

    authenticate: vi.fn().mockResolvedValue({
      access_token: 'mock-token',
      user: { login: 'testuser', id: 123 },
    }),
  },

  // Streaming operations
  streaming: {
    subscribe: vi.fn().mockImplementation((_taskId: string, callback: (data: any) => void) => {
      // Simulate streaming data
      const interval = setInterval(() => {
        callback({
          type: 'message',
          data: {
            id: `stream-${Date.now()}`,
            content: 'Streaming update',
            timestamp: new Date(),
          },
        })
      }, 100)

      return () => clearInterval(interval)
    }),

    send: vi.fn().mockResolvedValue(undefined),
  },
}

// Test data generators
export const testDataGenerators = {
  // Generate mock task
  createMockTask: (overrides: Partial<MockTask> = {}): MockTask => ({
    id: `task-${Date.now()}`,
    description: 'Test task description',
    status: 'pending',
    repository: 'user/test-repo',
    environment: 'node',
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
    ...overrides,
  }),

  // Generate mock environment
  createMockEnvironment: (overrides: Partial<MockEnvironment> = {}): MockEnvironment => ({
    id: `env-${Date.now()}`,
    name: 'Test Environment',
    status: 'active',
    repository: 'user/test-repo',
    branch: 'main',
    createdAt: new Date(),
    ...overrides,
  }),

  // Generate mock message
  createMockMessage: (overrides: Partial<MockMessage> = {}): MockMessage => ({
    id: `msg-${Date.now()}`,
    content: 'Test message content',
    role: 'user',
    timestamp: new Date(),
    ...overrides,
  }),

  // Generate multiple mock tasks
  createMockTasks: (count: number, overrides: Partial<MockTask> = {}): MockTask[] => {
    return Array.from({ length: count }, (_, i) => ({
      ...testDataGenerators.createMockTask(),
      id: `task-${i}`,
      description: `Test task ${i + 1}`,
      ...overrides,
    }))
  },
}

// State management utilities
export const mockStateUtils = {
  // Reset all mock data
  reset: () => {
    mockTasks = []
    mockEnvironments = []
    vi.clearAllMocks()
  },

  // Seed mock data
  seedData: (data: { tasks?: MockTask[]; environments?: MockEnvironment[] }) => {
    if (data.tasks) {
      mockTasks = [...data.tasks]
    }
    if (data.environments) {
      mockEnvironments = [...data.environments]
    }
  },

  // Get current state
  getState: () => ({
    tasks: [...mockTasks],
    environments: [...mockEnvironments],
  }),

  // Simulate errors
  simulateError: (method: string, error: Error) => {
    const [category, operation] = method.split('.')
    const categoryMock = (mockVibeKitSDK as any)[category]
    if (categoryMock?.[operation]) {
      categoryMock[operation].mockRejectedValueOnce(error)
    }
  },

  // Simulate loading delays
  simulateDelay: (method: string, delay: number) => {
    const [category, operation] = method.split('.')
    const categoryMock = (mockVibeKitSDK as any)[category]
    if (categoryMock?.[operation]) {
      const originalFn = categoryMock[operation]
      categoryMock[operation] = vi.fn().mockImplementation(async (...args) => {
        await new Promise((resolve) => setTimeout(resolve, delay))
        return originalFn(...args)
      })
    }
  },
}

// Setup function to apply VibeKit SDK mocks
export const setupVibeKitMocks = () => {
  vi.mock('@vibe-kit/sdk', () => ({
    default: mockVibeKitSDK,
    VibeKit: vi.fn().mockImplementation(() => mockVibeKitSDK),
  }))
}

// Test helpers for VibeKit testing
export const vibeKitTestHelpers = {
  // Assert task creation
  expectTaskCreated: (taskData: Partial<MockTask>) => {
    expect(mockVibeKitSDK.tasks.create).toHaveBeenCalledWith(expect.objectContaining(taskData))
  },

  // Assert environment creation
  expectEnvironmentCreated: (envData: Partial<MockEnvironment>) => {
    expect(mockVibeKitSDK.environments.create).toHaveBeenCalledWith(
      expect.objectContaining(envData)
    )
  },

  // Wait for task status change
  waitForTaskStatus: async (taskId: string, status: MockTask['status'], timeout = 1000) => {
    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const task = mockTasks.find((t) => t.id === taskId)
        if (task && task.status === status) {
          resolve(task)
        } else {
          setTimeout(checkStatus, 10)
        }
      }
      checkStatus()
      setTimeout(() => reject(new Error('Timeout waiting for task status')), timeout)
    })
  },

  // Get task by ID
  getTask: (id: string) => mockTasks.find((t) => t.id === id),

  // Get environment by ID
  getEnvironment: (id: string) => mockEnvironments.find((e) => e.id === id),
}

// Export setup function for easy integration
export const setupVibeKitSDKMocks = () => {
  setupVibeKitMocks()
  mockStateUtils.reset()
}

// Cleanup function
export const cleanupVibeKitMocks = () => {
  mockStateUtils.reset()
  vi.clearAllMocks()
}
