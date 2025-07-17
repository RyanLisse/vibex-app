import { test, expect, createAIWrapper } from './fixtures/base.fixture'
import { HomePage } from './page-objects/home.page'
import {
  generateTestData,
  takeTimestampedScreenshot,
  setupTestEnvironment,
} from './helpers/test-utils'

/**
 * Enhanced E2E test demonstrating AI-powered testing with Stagehand
 */
test.describe('Enhanced AI-Powered E2E Testing', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page)
  })

  test('should demonstrate AI interactions with natural language', async ({ 
    page, 
    stagehand, 
    schemas, 
    utils, 
    metrics 
  }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Take a screenshot of the initial state
    await takeTimestampedScreenshot(page, 'initial-state')

    // Use AI to understand the page structure with structured data
    const pageStructure = await utils.extractWithSchema(
      stagehand,
      'page structure including navigation, main content, and footer',
      schemas.PageDataSchema
    )

    expect(pageStructure.title).toBeTruthy()
    expect(pageStructure.headings.length).toBeGreaterThan(0)
    console.log('Page structure:', pageStructure)

    // Use AI to find and interact with elements
    const hasMainContent = await ai.observe({
      description: 'page has main content area with proper structure'
    })
    expect(hasMainContent).toBeTruthy()

    // Use AI to extract information
    const pageTitle = await ai.extract({
      description: 'the main page title'
    })
    expect(pageTitle).toBeTruthy()
    console.log('AI extracted page title:', pageTitle)

    // Use AI to fill a form
    const testData = generateTestData()
    await ai.act({
      action: 'fill',
      description: 'task input field',
      value: testData.taskDescription
    })

    // Use AI to submit the form
    await ai.act({ action: 'click', description: 'submit button' })
    await page.waitForTimeout(2000)

    // Use AI to verify the result
    const taskCreated = await ai.observe({
      description: `task containing "${testData.taskDescription}" is visible`
    })
    expect(taskCreated).toBeTruthy()

    // Take final screenshot
    await takeTimestampedScreenshot(page, 'task-created')
  })

  test('should demonstrate complex AI interactions with metrics', async ({ 
    page, 
    stagehand, 
    schemas, 
    utils, 
    metrics 
  }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Demonstrate complex AI queries with performance measurement
    const { result: navigationItems, metrics: navMetrics } = await homePage.measureAction(async () => {
      return await ai.extract({
        description: 'all navigation menu items with their text and links'
      })
    })
    console.log('Navigation items found:', navigationItems)
    console.log('Navigation extraction took:', navMetrics.duration, 'ms')

    // Use AI to understand UI state
    const isDarkMode = await ai.observe({
      description: 'interface is in dark mode'
    })
    console.log('Is dark mode active:', isDarkMode)

    // Use AI to find specific UI elements
    const hasSearchField = await ai.observe({
      description: 'search field is present and functional'
    })
    console.log('Has search field:', hasSearchField)

    // Use AI to understand button states
    const buttonStates = await ai.extract({
      description: 'all button states (enabled/disabled) with their purposes'
    })
    console.log('Button states:', buttonStates)

    // Use AI to verify responsive design
    await page.setViewportSize({ width: 375, height: 667 })
    const isMobileOptimized = await ai.observe({
      description: 'layout is optimized for mobile with proper touch targets'
    })
    console.log('Is mobile optimized:', isMobileOptimized)

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('should demonstrate AI-powered form validation with structured data', async ({ 
    page, 
    stagehand, 
    schemas, 
    utils, 
    metrics 
  }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Test empty form submission
    await ai.act({ action: 'click', description: 'submit button' })
    await page.waitForTimeout(1000)

    // Use AI to check for validation messages with structured data
    const formValidation = await utils.extractWithSchema(
      stagehand,
      'form validation state including errors, field states, and submission status',
      schemas.FormDataSchema
    )

    if (formValidation.errors && formValidation.errors.length > 0) {
      console.log('Validation errors:', formValidation.errors)
    }

    // Fill form with valid data
    const testData = generateTestData()
    await ai.act({
      action: 'fill',
      description: 'task input field',
      value: testData.taskDescription
    })

    // Use AI to verify form is now valid
    const isFormValid = await ai.observe({
      description: 'form is valid and can be submitted without errors'
    })
    console.log('Is form valid:', isFormValid)

    // Submit valid form
    await ai.act({ action: 'click', description: 'submit button' })
    await page.waitForTimeout(2000)

    // Use AI to verify successful submission
    const submissionSuccess = await ai.observe({
      description: 'form was successfully submitted with confirmation'
    })
    expect(submissionSuccess).toBeTruthy()
  })

  test('should demonstrate AI-powered accessibility testing', async ({ 
    page, 
    stagehand, 
    schemas, 
    utils, 
    metrics 
  }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Use enhanced accessibility validation
    const accessibilityData = await utils.validateAccessibility(stagehand)
    
    expect(accessibilityData.hasAltText).toBeTruthy()
    expect(accessibilityData.hasProperHeadings).toBeTruthy()
    expect(accessibilityData.hasKeyboardNavigation).toBeTruthy()
    expect(accessibilityData.hasGoodContrast).toBeTruthy()
    expect(accessibilityData.hasAriaLabels).toBeTruthy()

    console.log('Accessibility audit results:', accessibilityData)

    // Test keyboard navigation with AI verification
    await page.keyboard.press('Tab')
    const firstElementFocused = await ai.observe({
      description: 'first focusable element has visible focus indicator'
    })
    console.log('First element focused:', firstElementFocused)

    await page.keyboard.press('Tab')
    const secondElementFocused = await ai.observe({
      description: 'second focusable element has visible focus indicator'
    })
    console.log('Second element focused:', secondElementFocused)

    // Use AI to check color contrast
    const hasGoodContrast = await ai.observe({
      description: 'text has sufficient color contrast for accessibility standards'
    })
    console.log('Has good color contrast:', hasGoodContrast)
  })

  test('should demonstrate AI-powered performance testing with detailed metrics', async ({ 
    page, 
    stagehand, 
    schemas, 
    utils, 
    metrics 
  }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)

    // Measure page load time with detailed metrics
    const loadMetrics = await utils.measurePerformance(stagehand, async () => {
      await homePage.goto()
      await utils.waitForStable(stagehand)
    })

    console.log('Page load metrics:', loadMetrics)
    expect(loadMetrics.duration).toBeLessThan(5000) // Should load within 5 seconds

    // Use AI to verify page is fully loaded
    const pageFullyLoaded = await ai.observe({
      description: 'page is completely loaded with all content visible and interactive'
    })
    expect(pageFullyLoaded).toBeTruthy()

    // Use AI to check for loading indicators
    const hasLoadingSpinner = await ai.observe({
      description: 'loading spinner or progress indicator is visible'
    })
    console.log('Has loading spinner:', hasLoadingSpinner)

    // Use AI to verify responsive loading
    await page.setViewportSize({ width: 375, height: 667 })
    
    const mobileLoadMetrics = await utils.measurePerformance(stagehand, async () => {
      await page.reload()
      await homePage.waitForLoad()
    })

    console.log('Mobile load metrics:', mobileLoadMetrics)
    expect(mobileLoadMetrics.duration).toBeLessThan(3000) // Mobile should be faster
  })

  test('should demonstrate AI-powered error handling with recovery', async ({ 
    page, 
    stagehand, 
    schemas, 
    utils, 
    metrics 
  }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Simulate network error
    await page.route('**/*', (route) => {
      if (route.request().url().includes('api/')) {
        route.abort()
      } else {
        route.continue()
      }
    })

    // Try to perform an action that requires network
    await ai.act({ action: 'click', description: 'submit button' })
    await page.waitForTimeout(2000)

    // Use AI to check for error handling
    const errorHandling = await ai.observe({
      description: 'error message is displayed with appropriate user feedback'
    })
    console.log('Has error handling:', errorHandling)

    if (errorHandling) {
      const errorDetails = await ai.extract({
        description: 'error message text and any recovery options provided'
      })
      console.log('Error details:', errorDetails)
    }

    // Restore network and verify recovery
    await page.unroute('**/*')
    await page.reload()
    await homePage.waitForLoad()

    // Use AI to verify page recovered
    const pageRecovered = await ai.observe({
      description: 'page is working normally with all functionality restored'
    })
    expect(pageRecovered).toBeTruthy()
  })

  test.afterEach(async ({ page, metrics }) => {
    // Log enhanced test metrics
    console.log('Test metrics:', {
      duration: Date.now() - metrics.startTime,
      aiActions: metrics.actions.length,
      successRate: metrics.actions.filter(a => a.success).length / metrics.actions.length,
      averageActionTime: metrics.actions.reduce((sum, a) => sum + a.duration, 0) / metrics.actions.length,
      actionBreakdown: metrics.actions.reduce((acc, action) => {
        acc[action.type] = (acc[action.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    })
  })
})
