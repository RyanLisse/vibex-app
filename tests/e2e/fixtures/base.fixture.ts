import { test as base } from '@playwright/test'
import { Stagehand } from '@browserbasehq/stagehand'
import stagehandConfig, { TestUtils, getTestSchemas } from '../../../stagehand.config'

// Define the types for our fixtures
type BaseFixtures = {
  stagehand: Stagehand
  schemas: ReturnType<typeof getTestSchemas>
  utils: typeof TestUtils
  metrics: {
    startTime: number
    actions: Array<{
      type: string
      description: string
      duration: number
      success: boolean
      error?: string
    }>
  }
}

// Extend the base test with our fixtures
export const test = base.extend<BaseFixtures>({
  stagehand: async ({ page }, use) => {
    // Set up Stagehand with enhanced configuration
    const stagehand = new Stagehand(stagehandConfig)
    await stagehand.init()

    // Configure Stagehand to use the current Playwright page
    if (page.url() !== 'about:blank') {
      await stagehand.page.goto(page.url())
    }

    // Pass the Stagehand instance to the test
    await use(stagehand)

    // Clean up after the test
    await stagehand.close()
  },

  schemas: async ({}, use) => {
    await use(getTestSchemas())
  },

  utils: async ({}, use) => {
    await use(TestUtils)
  },

  metrics: async ({}, use) => {
    const metrics = {
      startTime: Date.now(),
      actions: [] as Array<{
        type: string
        description: string
        duration: number
        success: boolean
        error?: string
      }>
    }
    await use(metrics)
    
    // Log final metrics
    const totalDuration = Date.now() - metrics.startTime
    console.log(`Test completed in ${totalDuration}ms with ${metrics.actions.length} AI actions`)
    
    if (process.env.STAGEHAND_DEBUG === 'true') {
      console.log('Action breakdown:', metrics.actions)
    }
  },
})

export { expect } from '@playwright/test'

// Enhanced AI action wrapper with metrics
export class AIActionWrapper {
  constructor(
    private stagehand: Stagehand,
    private metrics: BaseFixtures['metrics']
  ) {}

  async act(action: { action: string; description: string; value?: string }) {
    const startTime = Date.now()
    let success = false
    let error: string | undefined

    try {
      await this.stagehand.act(action)
      success = true
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      this.metrics.actions.push({
        type: action.action,
        description: action.description,
        duration: Date.now() - startTime,
        success,
        error,
      })
    }
  }

  async extract(options: { description: string }) {
    const startTime = Date.now()
    let success = false
    let error: string | undefined
    let result: any

    try {
      result = await this.stagehand.extract(options)
      success = true
      return result
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      this.metrics.actions.push({
        type: 'extract',
        description: options.description,
        duration: Date.now() - startTime,
        success,
        error,
      })
    }
  }

  async observe(options: { description: string }) {
    const startTime = Date.now()
    let success = false
    let error: string | undefined
    let result: boolean

    try {
      result = await this.stagehand.observe(options)
      success = true
      return result
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      this.metrics.actions.push({
        type: 'observe',
        description: options.description,
        duration: Date.now() - startTime,
        success,
        error,
      })
    }
  }
}

// Create enhanced AI wrapper in tests
export const createAIWrapper = (stagehand: Stagehand, metrics: BaseFixtures['metrics']) => {
  return new AIActionWrapper(stagehand, metrics)
}
