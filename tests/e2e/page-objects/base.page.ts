import { Page } from '@playwright/test'
import { Stagehand } from '@browserbasehq/stagehand'
import { TestUtils } from '../../../stagehand.config'

/**
 * Base page object model with enhanced AI functionality
 */
export abstract class BasePage {
  protected page: Page
  protected stagehand: Stagehand
  protected baseUrl: string

  constructor(page: Page, stagehand: Stagehand, baseUrl: string = 'http://localhost:3000') {
    this.page = page
    this.stagehand = stagehand
    this.baseUrl = baseUrl
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string = '') {
    const url = `${this.baseUrl}${path}`
    await this.page.goto(url)
    await this.waitForLoad()
  }

  /**
   * Wait for the page to load completely
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle')
    await TestUtils.waitForStable(this.stagehand)
  }

  /**
   * Get the current page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title()
  }

  /**
   * Take a screenshot with enhanced options
   */
  async screenshot(
    name: string,
    options: { fullPage?: boolean; quality?: number } = {}
  ): Promise<Buffer> {
    const { fullPage = true, quality = 80 } = options
    return await this.page.screenshot({
      path: `tests/e2e/screenshots/${name}.png`,
      fullPage,
      quality,
    })
  }

  /**
   * Use Stagehand to interact with elements using natural language
   */
  async aiClick(description: string): Promise<void> {
    await this.stagehand.act({ action: 'click', description })
  }

  /**
   * Use Stagehand to fill forms using natural language
   */
  async aiFill(description: string, value: string): Promise<void> {
    await this.stagehand.act({ action: 'fill', description, value })
  }

  /**
   * Use Stagehand to extract information using natural language
   */
  async aiExtract(description: string): Promise<string> {
    return await this.stagehand.extract({ description })
  }

  /**
   * Use Stagehand to observe page state
   */
  async aiObserve(description: string): Promise<boolean> {
    return await this.stagehand.observe({ description })
  }

  /**
   * Enhanced wait for element with performance measurement
   */
  async waitForElement(description: string, timeout: number = 10000): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const isVisible = await this.aiObserve(description)
      if (isVisible) {
        return
      }
      await this.page.waitForTimeout(500)
    }

    throw new Error(`Element "${description}" not found within ${timeout}ms`)
  }

  /**
   * Measure performance of an action
   */
  async measureAction<T>(action: () => Promise<T>): Promise<{ result: T; metrics: any }> {
    const metrics = await TestUtils.measurePerformance(this.stagehand, action)
    return { result: await action(), metrics }
  }

  /**
   * Extract structured data using schema
   */
  async extractStructured<T>(description: string, schema: any): Promise<T> {
    return await TestUtils.extractWithSchema(this.stagehand, description, schema)
  }

  /**
   * Validate accessibility of current page
   */
  async validateAccessibility() {
    return await TestUtils.validateAccessibility(this.stagehand)
  }

  /**
   * Wait for element to disappear
   */
  async waitForElementToDisappear(description: string, timeout: number = 10000): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const isVisible = await this.aiObserve(description)
      if (!isVisible) {
        return
      }
      await this.page.waitForTimeout(500)
    }

    throw new Error(`Element "${description}" still visible after ${timeout}ms`)
  }

  /**
   * Check if element exists without throwing error
   */
  async elementExists(description: string): Promise<boolean> {
    try {
      return await this.aiObserve(description)
    } catch {
      return false
    }
  }

  /**
   * Get all text content from page
   */
  async getAllText(): Promise<string> {
    return await this.aiExtract('all visible text content on the page')
  }

  /**
   * Check if page is responsive
   */
  async isResponsive(): Promise<boolean> {
    return await this.aiObserve('page layout is responsive and mobile-friendly')
  }

  /**
   * Get page loading state
   */
  async isLoading(): Promise<boolean> {
    return await this.aiObserve('page is showing loading indicators or spinners')
  }

  /**
   * Verify page has no errors
   */
  async hasNoErrors(): Promise<boolean> {
    return await this.aiObserve('page has no error messages or broken elements')
  }

  /**
   * Get navigation state
   */
  async getNavigationState(): Promise<any> {
    return await this.aiExtract('navigation menu state including active items and visibility')
  }

  /**
   * Click with retry logic
   */
  async clickWithRetry(description: string, maxRetries: number = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.aiClick(description)
        return
      } catch (error) {
        if (i === maxRetries - 1) throw error
        await this.page.waitForTimeout(1000)
      }
    }
  }

  /**
   * Fill with retry logic
   */
  async fillWithRetry(description: string, value: string, maxRetries: number = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.aiFill(description, value)
        return
      } catch (error) {
        if (i === maxRetries - 1) throw error
        await this.page.waitForTimeout(1000)
      }
    }
  }
}
