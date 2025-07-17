import { test, expect } from '../fixtures/base.fixture'
import { HomePage } from '../page-objects/home.page'

test.describe('Home Page', () => {
  test('should display the home page correctly', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Check if page loads correctly
    await expect(page).toHaveTitle(/Codex Clone/)

    // Verify navigation is visible
    const isNavVisible = await homePage.isNavigationVisible()
    expect(isNavVisible).toBeTruthy()
  })

  test('should toggle theme correctly', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Check initial theme state
    const initialDarkMode = await homePage.isDarkMode()

    // Toggle theme
    await homePage.toggleTheme()

    // Wait for theme change
    await page.waitForTimeout(1000)

    // Verify theme changed
    const newDarkMode = await homePage.isDarkMode()
    expect(newDarkMode).not.toBe(initialDarkMode)
  })

  test('should navigate to environments page', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Navigate to environments
    await homePage.goToEnvironments()

    // Verify URL changed
    await expect(page).toHaveURL(/\/environments/)
  })

  test('should create a new task using AI interactions', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Check if task form is visible
    const isFormVisible = await homePage.isTaskFormVisible()
    expect(isFormVisible).toBeTruthy()

    // Create a new task
    const taskDescription = 'Test task created by AI'
    await homePage.createTask(taskDescription)

    // Wait for task to be created
    await page.waitForTimeout(2000)

    // Verify task appears in the list
    const tasks = await homePage.getVisibleTasks()
    expect(tasks.some((task) => task.includes(taskDescription))).toBeTruthy()
  })

  test('should interact with task list using natural language', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Create a task first
    const taskDescription = 'AI interaction test task'
    await homePage.createTask(taskDescription)

    // Wait for task creation
    await page.waitForTimeout(2000)

    // Click on the created task using AI
    await homePage.clickTask(taskDescription)

    // Verify navigation to task detail page
    await expect(page).toHaveURL(/\/task\/[^\/]+/)
  })

  test('should handle empty task creation gracefully', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Try to create an empty task
    await homePage.createTask('')

    // Wait a moment
    await page.waitForTimeout(1000)

    // Verify form validation or no empty task creation
    const tasks = await homePage.getVisibleTasks()
    expect(tasks.every((task) => task.trim().length > 0)).toBeTruthy()
  })

  test('should display main heading correctly', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Get main heading using AI
    const heading = await homePage.getMainHeading()
    expect(heading).toBeTruthy()
    expect(heading.length).toBeGreaterThan(0)
  })

  test('should maintain responsive design on mobile', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await homePage.goto()

    // Verify navigation is still accessible
    const isNavVisible = await homePage.isNavigationVisible()
    expect(isNavVisible).toBeTruthy()

    // Verify task form is still functional
    const isFormVisible = await homePage.isTaskFormVisible()
    expect(isFormVisible).toBeTruthy()
  })
})
