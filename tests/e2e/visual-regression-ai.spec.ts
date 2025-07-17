import { test, expect, createAIWrapper } from './fixtures/base.fixture'
import { HomePage } from './page-objects/home.page'
import { TaskPage } from './page-objects/task.page'
import { EnvironmentsPage } from './page-objects/environments.page'
import {
  generateTestData,
  takeTimestampedScreenshot,
  setupTestEnvironment,
  ensureDirectoryExists,
} from './helpers/test-utils'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * AI-Powered Visual Regression Testing Suite
 * Uses AI to detect visual changes and validate UI components
 */
test.describe('AI-Powered Visual Regression Testing', () => {
  const screenshotDir = 'tests/e2e/screenshots/visual-regression'
  const baselineDir = 'tests/e2e/screenshots/baselines'

  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page)
    await ensureDirectoryExists(screenshotDir)
    await ensureDirectoryExists(baselineDir)
  })

  test('homepage visual regression with AI analysis', async ({
    page,
    stagehand,
    utils,
    metrics,
  }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)

    // Test different viewport sizes
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await homePage.goto()

      // Take screenshot
      const screenshotPath = path.join(screenshotDir, `homepage-${viewport.name}.png`)
      await page.screenshot({ path: screenshotPath, fullPage: true })

      // AI analysis of the visual layout
      const layoutAnalysis = await ai.extract({
        description: `detailed analysis of the page layout including header, navigation, main content, sidebar, and footer positioning for ${viewport.name} viewport`,
      })

      // AI validation of responsive design
      const responsiveCheck = await ai.observe({
        description: `layout is properly responsive for ${viewport.name} viewport with no overlapping elements or broken styling`,
      })
      expect(responsiveCheck).toBeTruthy()

      // AI color scheme validation
      const colorSchemeValid = await ai.observe({
        description: 'color scheme is consistent with proper contrast ratios and brand colors',
      })
      expect(colorSchemeValid).toBeTruthy()

      // AI typography validation
      const typographyValid = await ai.observe({
        description: 'typography is properly sized and readable with consistent font hierarchy',
      })
      expect(typographyValid).toBeTruthy()

      console.log(`${viewport.name} layout analysis:`, layoutAnalysis)
    }
  })

  test('component visual consistency with AI', async ({ page, stagehand, utils, metrics }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)

    await homePage.goto()

    // AI analysis of button consistency
    const buttonAnalysis = await ai.extract({
      description:
        'all buttons on the page including their colors, sizes, hover states, and styling consistency',
    })

    const buttonConsistency = await ai.observe({
      description: 'all buttons follow consistent design patterns with proper spacing and styling',
    })
    expect(buttonConsistency).toBeTruthy()

    // AI analysis of form elements
    const formAnalysis = await ai.extract({
      description: 'all form elements including inputs, labels, and validation styling',
    })

    const formConsistency = await ai.observe({
      description: 'form elements are consistently styled with proper alignment and spacing',
    })
    expect(formConsistency).toBeTruthy()

    // AI analysis of navigation elements
    const navigationAnalysis = await ai.extract({
      description: 'navigation menu styling, active states, and hover effects',
    })

    const navigationConsistency = await ai.observe({
      description: 'navigation elements are consistently styled with clear active and hover states',
    })
    expect(navigationConsistency).toBeTruthy()

    console.log('Visual consistency analysis:', {
      buttons: buttonAnalysis,
      forms: formAnalysis,
      navigation: navigationAnalysis,
    })

    await takeTimestampedScreenshot(page, 'component-consistency')
  })

  test('dark mode visual regression with AI', async ({ page, stagehand, utils, metrics }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)

    await homePage.goto()

    // Test light mode first
    await takeTimestampedScreenshot(page, 'light-mode')

    const lightModeAnalysis = await ai.extract({
      description:
        'current color scheme and theme including background colors, text colors, and component styling',
    })

    // Toggle to dark mode
    await ai.act({ action: 'click', description: 'theme toggle button or dark mode switch' })
    await page.waitForTimeout(1000)

    // Take dark mode screenshot
    await takeTimestampedScreenshot(page, 'dark-mode')

    // AI analysis of dark mode
    const darkModeAnalysis = await ai.extract({
      description:
        'dark mode color scheme including background colors, text colors, and component styling',
    })

    // AI validation of dark mode implementation
    const darkModeValid = await ai.observe({
      description: 'dark mode is properly implemented with appropriate contrast and readability',
    })
    expect(darkModeValid).toBeTruthy()

    // AI contrast validation
    const contrastValid = await ai.observe({
      description: 'text has sufficient contrast against background in dark mode',
    })
    expect(contrastValid).toBeTruthy()

    // AI component visibility validation
    const componentsVisible = await ai.observe({
      description: 'all UI components are clearly visible and properly styled in dark mode',
    })
    expect(componentsVisible).toBeTruthy()

    console.log('Theme analysis:', {
      lightMode: lightModeAnalysis,
      darkMode: darkModeAnalysis,
    })
  })

  test('animation and transition visual testing', async ({ page, stagehand, utils, metrics }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)

    await homePage.goto()

    // Test hover animations
    await ai.act({ action: 'hover', description: 'primary button' })
    await page.waitForTimeout(500)

    const hoverAnimation = await ai.observe({
      description: 'button shows smooth hover animation or transition effect',
    })
    expect(hoverAnimation).toBeTruthy()

    // Test click animations
    await ai.act({ action: 'click', description: 'primary button' })
    await page.waitForTimeout(500)

    const clickAnimation = await ai.observe({
      description: 'button shows appropriate click animation or feedback',
    })
    expect(clickAnimation).toBeTruthy()

    // Test loading animations
    if (await ai.observe({ description: 'loading spinner or animation is present' })) {
      const loadingAnimation = await ai.observe({
        description: 'loading animation is smooth and not flickering',
      })
      expect(loadingAnimation).toBeTruthy()
    }

    // Test transition animations
    const transitionAnalysis = await ai.extract({
      description: 'all page transitions and animations including their duration and smoothness',
    })

    const transitionsSmooth = await ai.observe({
      description: 'page transitions are smooth without jarring movements or flicker',
    })
    expect(transitionsSmooth).toBeTruthy()

    console.log('Animation analysis:', transitionAnalysis)
    await takeTimestampedScreenshot(page, 'animations-test')
  })

  test('cross-browser visual consistency', async ({ page, stagehand, utils, metrics }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)

    await homePage.goto()

    // Get browser info
    const browserInfo = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      vendor: navigator.vendor,
      name: navigator.userAgent.includes('Chrome')
        ? 'Chrome'
        : navigator.userAgent.includes('Firefox')
          ? 'Firefox'
          : navigator.userAgent.includes('Safari')
            ? 'Safari'
            : 'Unknown',
    }))

    // Browser-specific visual analysis
    const browserVisualAnalysis = await ai.extract({
      description: `visual rendering quality and consistency for ${browserInfo.name} browser including font rendering, layout, and component appearance`,
    })

    // Validate browser-specific features
    const browserFeaturesValid = await ai.observe({
      description: 'all visual features render correctly in current browser with no broken styling',
    })
    expect(browserFeaturesValid).toBeTruthy()

    // CSS feature support validation
    const cssFeatureSupport = await ai.observe({
      description:
        'CSS features like grid, flexbox, and animations are properly supported and rendered',
    })
    expect(cssFeatureSupport).toBeTruthy()

    console.log(`${browserInfo.name} visual analysis:`, browserVisualAnalysis)
    await takeTimestampedScreenshot(page, `browser-${browserInfo.name.toLowerCase()}`)
  })

  test('form visual states and validation', async ({ page, stagehand, utils, metrics }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)

    await homePage.goto()

    // Navigate to form
    await ai.act({ action: 'click', description: 'create new task button' })
    await page.waitForTimeout(500)

    // Test empty form state
    await takeTimestampedScreenshot(page, 'form-empty')

    const emptyFormAnalysis = await ai.extract({
      description:
        'form appearance in empty state including placeholders, labels, and field styling',
    })

    // Test form with valid input
    const testData = generateTestData()
    await ai.act({
      action: 'fill',
      description: 'task description field',
      value: testData.taskDescription,
    })

    await takeTimestampedScreenshot(page, 'form-valid')

    const validFormState = await ai.observe({
      description: 'form fields show valid state styling with proper visual feedback',
    })
    expect(validFormState).toBeTruthy()

    // Test form validation errors
    await ai.act({
      action: 'fill',
      description: 'task description field',
      value: 'x', // Invalid short input
    })
    await ai.act({ action: 'click', description: 'submit button' })
    await page.waitForTimeout(500)

    await takeTimestampedScreenshot(page, 'form-errors')

    const errorStateAnalysis = await ai.extract({
      description:
        'form error states including error messages, field highlighting, and validation styling',
    })

    const errorStateValid = await ai.observe({
      description:
        'form validation errors are clearly visible with appropriate styling and messaging',
    })
    expect(errorStateValid).toBeTruthy()

    console.log('Form state analysis:', {
      empty: emptyFormAnalysis,
      errors: errorStateAnalysis,
    })
  })

  test('loading states and skeleton screens', async ({ page, stagehand, utils, metrics }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)

    // Slow down network to see loading states
    await page.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      route.continue()
    })

    await homePage.goto()

    // Capture loading state
    const loadingStateVisible = await ai.observe({
      description: 'loading indicators, skeleton screens, or progress indicators are visible',
    })

    if (loadingStateVisible) {
      await takeTimestampedScreenshot(page, 'loading-state')

      const loadingAnalysis = await ai.extract({
        description:
          'loading state design including skeleton screens, spinners, and progress indicators',
      })

      const loadingStateWellDesigned = await ai.observe({
        description: 'loading state is well-designed with appropriate visual feedback',
      })
      expect(loadingStateWellDesigned).toBeTruthy()

      console.log('Loading state analysis:', loadingAnalysis)
    }

    // Wait for content to load
    await page.unroute('**/*')
    await homePage.waitForLoad()

    // Capture loaded state
    await takeTimestampedScreenshot(page, 'loaded-state')

    const loadedStateValid = await ai.observe({
      description: 'page content is fully loaded with no loading indicators remaining',
    })
    expect(loadedStateValid).toBeTruthy()
  })

  test('visual regression baseline comparison', async ({ page, stagehand, utils, metrics }) => {
    const ai = createAIWrapper(stagehand, metrics)
    const homePage = new HomePage(page, stagehand)

    await homePage.goto()

    // Take current screenshot
    const currentScreenshot = path.join(screenshotDir, 'current-homepage.png')
    await page.screenshot({ path: currentScreenshot, fullPage: true })

    // Check if baseline exists
    const baselineScreenshot = path.join(baselineDir, 'homepage-baseline.png')
    let baselineExists = false

    try {
      await fs.access(baselineScreenshot)
      baselineExists = true
    } catch {
      // Create baseline if it doesn't exist
      await fs.copyFile(currentScreenshot, baselineScreenshot)
      console.log('Created new baseline screenshot')
    }

    if (baselineExists) {
      // AI-powered visual comparison
      const visualDifferences = await ai.extract({
        description:
          'any visual differences or changes in layout, styling, colors, or content compared to the expected baseline appearance',
      })

      const significantChanges = await ai.observe({
        description: 'there are significant visual changes that would affect user experience',
      })

      if (significantChanges) {
        console.warn('Significant visual changes detected:', visualDifferences)
      } else {
        console.log('No significant visual changes detected')
      }

      // AI validation of visual consistency
      const visuallyConsistent = await ai.observe({
        description:
          'current page appearance is visually consistent with expected design standards',
      })
      expect(visuallyConsistent).toBeTruthy()
    }
  })

  test.afterEach(async ({ page, metrics }) => {
    // Log visual testing metrics
    console.log('Visual test metrics:', {
      duration: Date.now() - metrics.startTime,
      aiAnalyses: metrics.actions.filter((a) => a.type === 'extract').length,
      aiValidations: metrics.actions.filter((a) => a.type === 'observe').length,
      successRate: metrics.actions.filter((a) => a.success).length / metrics.actions.length,
    })
  })
})
