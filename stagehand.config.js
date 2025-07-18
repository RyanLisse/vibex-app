const { z } = require('zod')

// Define schemas for comprehensive data extraction
const PageDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  headings: z.array(z.string()),
  links: z.array(
    z.object({
      text: z.string(),
      href: z.string().url(),
    })
  ),
  meta: z
    .object({
      keywords: z.array(z.string()).optional(),
      author: z.string().optional(),
      viewport: z.string().optional(),
    })
    .optional(),
  performance: z
    .object({
      loadTime: z.number().optional(),
      domContentLoaded: z.number().optional(),
      firstPaint: z.number().optional(),
    })
    .optional(),
})

const FormDataSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(10),
  submitted: z.boolean(),
  errors: z.array(z.string()).optional(),
})

const TaskDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  createdAt: z.string(),
  updatedAt: z.string(),
  progress: z.number().min(0).max(100).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        timestamp: z.string(),
      })
    )
    .optional(),
})

const EnvironmentDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['node', 'python', 'docker', 'browser']),
  status: z.enum(['active', 'inactive', 'building', 'error']),
  description: z.string().optional(),
  config: z.record(z.any()).optional(),
})

const AccessibilityDataSchema = z.object({
  hasAltText: z.boolean(),
  hasProperHeadings: z.boolean(),
  hasKeyboardNavigation: z.boolean(),
  hasGoodContrast: z.boolean(),
  hasAriaLabels: z.boolean(),
  issues: z
    .array(
      z.object({
        type: z.string(),
        description: z.string(),
        element: z.string().optional(),
        severity: z.enum(['error', 'warning', 'info']),
      })
    )
    .optional(),
})

const NavigationDataSchema = z.object({
  items: z.array(
    z.object({
      text: z.string(),
      href: z.string(),
      active: z.boolean(),
      submenu: z
        .array(
          z.object({
            text: z.string(),
            href: z.string(),
          })
        )
        .optional(),
    })
  ),
  breadcrumbs: z.array(z.string()).optional(),
  isResponsive: z.boolean(),
  hasMobileMenu: z.boolean(),
})

const TestMetricsSchema = z.object({
  testName: z.string(),
  duration: z.number(),
  actions: z.array(
    z.object({
      type: z.enum(['click', 'fill', 'observe', 'extract']),
      description: z.string(),
      duration: z.number(),
      success: z.boolean(),
      error: z.string().optional(),
    })
  ),
  screenshots: z.array(z.string()).optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
})

// Stagehand configuration for different environments
const getStagehandConfig = () => {
  const isProd = process.env.NODE_ENV === 'production'
  const isCI = process.env.CI === 'true'

  return {
    // Environment-specific settings
    env: process.env.BROWSERBASE_API_KEY ? 'BROWSERBASE' : 'LOCAL',
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,

    // AI Model Configuration
    llmClient: {
      provider: 'openai',
      model: process.env.STAGEHAND_MODEL || 'gpt-4o',
      clientOptions: {
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 3,
        timeout: 30_000,
      },
    },

    // Browser Configuration
    headless: isCI || isProd,
    verbose: isCI ? 0 : 1,
    debugDom: process.env.DEBUG_DOM === 'true',

    // Performance Settings
    defaultTimeout: 30_000,
    domSettleTimeoutMs: 30_000,
    enableCaching: true,

    // Advanced AI Features
    enableRecording: !isProd,
    enableTracing: !isProd,

    // Custom logger for better debugging
    logger: (_message, level = 'info') => {
      const timestamp = new Date().toISOString()
      const _prefix = `[${timestamp}] [Stagehand:${level.toUpperCase()}]`

      if (process.env.STAGEHAND_DEBUG === 'true' || !isProd) {
      }
    },

    // Retry configuration for better reliability
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
    },

    // Screenshot configuration
    screenshotConfig: {
      enabled: true,
      onFailure: true,
      onSuccess: false,
      quality: 80,
      fullPage: true,
    },

    // Performance monitoring
    performanceConfig: {
      enabled: true,
      trackMemory: true,
      trackTiming: true,
      trackNetworkRequests: true,
    },
  }
}

const config = getStagehandConfig()

// Export utility functions for test configuration
const createTestConfig = (overrides = {}) => {
  return { ...getStagehandConfig(), ...overrides }
}

const getTestSchemas = () => ({
  PageDataSchema,
  FormDataSchema,
  TaskDataSchema,
  EnvironmentDataSchema,
  AccessibilityDataSchema,
  NavigationDataSchema,
  TestMetricsSchema,
})

// Export test utilities
const TestUtils = {
  async waitForStable(stagehand, timeout = 5000) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      const isStable = await stagehand.observe({
        description: 'page content is stable and fully loaded',
      })
      if (isStable) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw new Error('Page did not stabilize within timeout')
  },

  async measurePerformance(_stagehand, action) {
    const start = performance.now()
    await action()
    const duration = performance.now() - start

    return {
      duration,
      timestamp: new Date().toISOString(),
      memory: performance.memory
        ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
          }
        : null,
    }
  },

  async extractWithSchema(stagehand, description, schema) {
    const rawData = await stagehand.extract({ description })
    return schema.parse(JSON.parse(rawData))
  },

  async validateAccessibility(stagehand) {
    const data = await stagehand.extract({
      description:
        'accessibility information including alt text, headings, keyboard navigation, color contrast, and ARIA labels',
    })
    return AccessibilityDataSchema.parse(JSON.parse(data))
  },

  async captureMetrics(_stagehand, testName, actions) {
    return TestMetricsSchema.parse({
      testName,
      duration: actions.reduce((sum, action) => sum + action.duration, 0),
      actions,
      screenshots: [], // Will be populated by test runner
      aiConfidence: 0.95, // Mock confidence score
    })
  },
}

module.exports = config
module.exports.getStagehandConfig = getStagehandConfig
module.exports.createTestConfig = createTestConfig
module.exports.getTestSchemas = getTestSchemas
module.exports.TestUtils = TestUtils
module.exports.PageDataSchema = PageDataSchema
module.exports.FormDataSchema = FormDataSchema
module.exports.TaskDataSchema = TaskDataSchema
module.exports.EnvironmentDataSchema = EnvironmentDataSchema
module.exports.AccessibilityDataSchema = AccessibilityDataSchema
module.exports.NavigationDataSchema = NavigationDataSchema
module.exports.TestMetricsSchema = TestMetricsSchema
