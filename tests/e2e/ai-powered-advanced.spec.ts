import { test, expect, createAIWrapper } from './fixtures/base.fixture'
import { HomePage } from './page-objects/home.page'
import { TaskPage } from './page-objects/task.page'
import { EnvironmentsPage } from './page-objects/environments.page'
import {
  generateTestData,
  takeTimestampedScreenshot,
  setupTestEnvironment,
  retryWithBackoff,
  ensureDirectoryExists,
} from './helpers/test-utils'

/**
 * Advanced AI-Powered Testing Examples
 * Demonstrates sophisticated testing patterns using Stagehand
 */
test.describe('Advanced AI-Powered Testing', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page)
    await ensureDirectoryExists('tests/e2e/screenshots')
  })

  test('comprehensive workflow testing with AI validation', async ({
    page,
    stagehand,
    schemas,
    utils,
    metrics,
  }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)
    const taskPage = new TaskPage(page, stagehand)
    const testData = generateTestData()

    // Navigate to home page with AI validation
    await homePage.goto()
    await takeTimestampedScreenshot(page, 'workflow-start')

    // Use AI to validate page structure
    const pageStructure = await ai.extract({
      description: 'complete page structure including navigation, main content, and footer',
    })

    // Validate using schema
    const structuredData = await utils.extractWithSchema(
      stagehand,
      'page metadata including title, description, and navigation items',
      schemas.PageDataSchema
    )

    expect(structuredData.title).toBeTruthy()
    expect(structuredData.headings.length).toBeGreaterThan(0)

    // Create a task with AI-powered form validation
    await ai.act({ action: 'click', description: 'primary task creation button' })
    await page.waitForTimeout(1000)

    // Fill form with AI assistance
    await ai.act({
      action: 'fill',
      description: 'task description input field',
      value: testData.taskDescription,
    })

    // Use AI to validate form state
    const formValidation = await ai.observe({
      description: 'form is valid and ready for submission',
    })
    expect(formValidation).toBeTruthy()

    // Submit form
    await ai.act({ action: 'click', description: 'submit task button' })
    await page.waitForTimeout(2000)

    // Verify task creation with structured data extraction
    const taskData = await utils.extractWithSchema(
      stagehand,
      'created task information including id, title, status, and timestamp',
      schemas.TaskDataSchema
    )

    expect(taskData.title).toContain(testData.taskDescription.substring(0, 20))
    expect(taskData.status).toBe('pending')

    // Navigate to task details
    await taskPage.goto(`/task/${taskData.id}`)
    await takeTimestampedScreenshot(page, 'task-details')

    // Monitor task progress with AI
    await retryWithBackoff(
      async () => {
        const progressObservation = await ai.observe({
          description: 'task status has changed from pending to running',
        })
        expect(progressObservation).toBeTruthy()
      },
      5,
      2000
    )

    // Validate task interface completeness
    const taskInterface = await ai.extract({
      description: 'all interactive elements including buttons, inputs, and status indicators',
    })
    console.log('Task interface elements:', taskInterface)

    await takeTimestampedScreenshot(page, 'workflow-complete')
  })

  test('advanced accessibility testing with AI', async ({
    page,
    stagehand,
    schemas,
    utils,
    metrics,
  }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)

    await homePage.goto()

    // Comprehensive accessibility audit
    const accessibilityData = await utils.validateAccessibility(stagehand)

    // Validate each accessibility aspect
    expect(accessibilityData.hasAltText).toBeTruthy()
    expect(accessibilityData.hasProperHeadings).toBeTruthy()
    expect(accessibilityData.hasKeyboardNavigation).toBeTruthy()
    expect(accessibilityData.hasGoodContrast).toBeTruthy()
    expect(accessibilityData.hasAriaLabels).toBeTruthy()

    // Test keyboard navigation flow
    await page.keyboard.press('Tab')
    const firstFocusable = await ai.observe({
      description: 'first focusable element has focus indicator',
    })
    expect(firstFocusable).toBeTruthy()

    // Test multiple tab navigation
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100)
    }

    // Verify focus is still within the page
    const focusVisible = await ai.observe({
      description: 'focused element has visible focus indicator',
    })
    expect(focusVisible).toBeTruthy()

    // Test screen reader compatibility
    const ariaLabels = await ai.extract({
      description: 'all ARIA labels and descriptions on the page',
    })
    expect(ariaLabels).toBeTruthy()

    // Test color contrast
    const contrastIssues = await ai.extract({
      description: 'any color contrast issues or violations',
    })
    console.log('Contrast analysis:', contrastIssues)

    await takeTimestampedScreenshot(page, 'accessibility-audit')
  })

  test('performance monitoring with AI insights', async ({
    page,
    stagehand,
    schemas,
    utils,
    metrics,
  }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)

    // Measure page load performance
    const loadMetrics = await utils.measurePerformance(stagehand, async () => {
      await homePage.goto()
      await utils.waitForStable(stagehand)
    })

    console.log('Load performance:', loadMetrics)
    expect(loadMetrics.duration).toBeLessThan(5000)

    // AI-powered performance analysis
    const performanceInsights = await ai.extract({
      description:
        'performance indicators including loading states, animations, and responsiveness',
    })
    console.log('AI performance insights:', performanceInsights)

    // Test responsive performance
    const viewports = [
      { width: 375, height: 667 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1920, height: 1080 }, // Desktop
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.waitForTimeout(500)

      const responsiveMetrics = await utils.measurePerformance(stagehand, async () => {
        await page.reload()
        await utils.waitForStable(stagehand)
      })

      console.log(`${viewport.width}x${viewport.height} performance:`, responsiveMetrics)
      expect(responsiveMetrics.duration).toBeLessThan(3000)

      // AI validation of responsive layout
      const isResponsive = await ai.observe({
        description: 'layout is properly optimized for current viewport size',
      })
      expect(isResponsive).toBeTruthy()
    }

    await takeTimestampedScreenshot(page, 'performance-test')
  })

  test('advanced form validation with AI', async ({ page, stagehand, schemas, utils, metrics }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)

    await homePage.goto()

    // Test empty form validation
    await ai.act({ action: 'click', description: 'task creation button' })
    await ai.act({ action: 'click', description: 'submit button' })
    await page.waitForTimeout(500)

    const validationErrors = await ai.extract({
      description: 'all form validation error messages',
    })
    expect(validationErrors).toBeTruthy()

    // Test invalid input validation
    await ai.act({
      action: 'fill',
      description: 'task description field',
      value: 'x', // Too short
    })
    await ai.act({ action: 'click', description: 'submit button' })
    await page.waitForTimeout(500)

    const shortInputError = await ai.observe({
      description: 'validation error about minimum length requirement',
    })
    expect(shortInputError).toBeTruthy()

    // Test valid input
    const testData = generateTestData()
    await ai.act({
      action: 'fill',
      description: 'task description field',
      value: testData.taskDescription,
    })

    const formValid = await ai.observe({
      description: 'form is valid with no error messages',
    })
    expect(formValid).toBeTruthy()

    // Test form submission
    await ai.act({ action: 'click', description: 'submit button' })
    await page.waitForTimeout(2000)

    const submitSuccess = await ai.observe({
      description: 'form was successfully submitted with confirmation message',
    })
    expect(submitSuccess).toBeTruthy()

    await takeTimestampedScreenshot(page, 'form-validation')
  })

  test('cross-browser compatibility testing with AI', async ({
    page,
    stagehand,
    schemas,
    utils,
    metrics,
  }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)

    await homePage.goto()

    // Test browser-specific features
    const browserInfo = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      vendor: navigator.vendor,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      language: navigator.language,
    }))

    console.log('Browser info:', browserInfo)

    // AI-powered browser compatibility check
    const compatibilityCheck = await ai.extract({
      description: 'browser compatibility issues or features that may not work correctly',
    })
    console.log('Compatibility analysis:', compatibilityCheck)

    // Test CSS features
    const cssFeatures = await ai.observe({
      description: 'CSS animations, gradients, and modern features are working correctly',
    })
    expect(cssFeatures).toBeTruthy()

    // Test JavaScript features
    const jsFeatures = await ai.observe({
      description: 'JavaScript interactive features are functioning properly',
    })
    expect(jsFeatures).toBeTruthy()

    // Test local storage
    await page.evaluate(() => {
      localStorage.setItem('test-key', 'test-value')
    })

    const storageWorking = await ai.observe({
      description: 'local storage functionality is working',
    })
    expect(storageWorking).toBeTruthy()

    await takeTimestampedScreenshot(page, 'browser-compatibility')
  })

  test('error handling and recovery with AI', async ({
    page,
    stagehand,
    schemas,
    utils,
    metrics,
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

    // Attempt action that requires API
    await ai.act({ action: 'click', description: 'create new task button' })
    await page.waitForTimeout(1000)

    // Check for error handling
    const errorHandling = await ai.observe({
      description: 'error message or loading state is displayed appropriately',
    })
    expect(errorHandling).toBeTruthy()

    // Extract error details
    const errorDetails = await ai.extract({
      description: 'error message text and recovery options',
    })
    console.log('Error handling details:', errorDetails)

    // Test recovery mechanism
    await page.unroute('**/*')
    await page.reload()
    await homePage.goto()

    // Verify recovery
    const recoverySuccess = await ai.observe({
      description: 'application has recovered and is functioning normally',
    })
    expect(recoverySuccess).toBeTruthy()

    await takeTimestampedScreenshot(page, 'error-recovery')
  })

  test('multi-step workflow with AI state management', async ({
    page,
    stagehand,
    schemas,
    utils,
    metrics,
  }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)
    const environmentsPage = new EnvironmentsPage(page, stagehand)
    const testData = generateTestData()

    // Step 1: Create environment
    await environmentsPage.goto()
    await takeTimestampedScreenshot(page, 'step1-environments')

    await ai.act({ action: 'click', description: 'create new environment button' })
    await ai.act({
      action: 'fill',
      description: 'environment name field',
      value: testData.environmentName,
    })
    await ai.act({
      action: 'fill',
      description: 'environment description field',
      value: testData.environmentDescription,
    })
    await ai.act({ action: 'click', description: 'create environment button' })

    // Verify environment creation
    const environmentCreated = await ai.observe({
      description: 'environment was successfully created and is visible in the list',
    })
    expect(environmentCreated).toBeTruthy()

    // Step 2: Navigate to tasks and create task
    await homePage.goto()
    await takeTimestampedScreenshot(page, 'step2-tasks')

    await ai.act({ action: 'click', description: 'create new task button' })
    await ai.act({
      action: 'fill',
      description: 'task description field',
      value: testData.taskDescription,
    })

    // Select the created environment
    await ai.act({
      action: 'click',
      description: 'environment dropdown',
    })
    await ai.act({
      action: 'click',
      description: `option containing "${testData.environmentName}"`,
    })

    await ai.act({ action: 'click', description: 'create task button' })

    // Verify task creation with environment link
    const taskWithEnvironment = await ai.observe({
      description: 'task was created and is linked to the selected environment',
    })
    expect(taskWithEnvironment).toBeTruthy()

    // Step 3: Monitor task execution
    const taskData = await utils.extractWithSchema(
      stagehand,
      'created task information including id, title, status, and environment',
      schemas.TaskDataSchema
    )

    // Navigate to task details
    await page.goto(`/task/${taskData.id}`)
    await takeTimestampedScreenshot(page, 'step3-task-details')

    // Monitor progress with AI
    await retryWithBackoff(
      async () => {
        const progressUpdate = await ai.observe({
          description: 'task is showing progress updates or completion',
        })
        expect(progressUpdate).toBeTruthy()
      },
      10,
      3000
    )

    await takeTimestampedScreenshot(page, 'workflow-complete')
  })

  test.afterEach(async ({ page, metrics }) => {
    // Log test metrics
    console.log('Test metrics:', {
      duration: Date.now() - metrics.startTime,
      aiActions: metrics.actions.length,
      successRate: metrics.actions.filter((a) => a.success).length / metrics.actions.length,
      averageActionTime:
        metrics.actions.reduce((sum, a) => sum + a.duration, 0) / metrics.actions.length,
    })
  })
})
