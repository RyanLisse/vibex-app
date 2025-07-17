import { test, expect } from '../fixtures/base.fixture'
import { HomePage } from '../page-objects/home.page'
import { EnvironmentsPage } from '../page-objects/environments.page'
import { TaskPage } from '../page-objects/task.page'

test.describe('Integration Tests', () => {
  test('should complete full user workflow', async ({ page, stagehand }) => {
    // Start at home page
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // 1. Toggle theme to test UI state
    await homePage.toggleTheme()
    await page.waitForTimeout(1000)

    // 2. Navigate to environments
    await homePage.goToEnvironments()
    await expect(page).toHaveURL(/\/environments/)

    // 3. Create a new environment
    const environmentsPage = new EnvironmentsPage(page, stagehand)
    await environmentsPage.openCreateDialog()
    await environmentsPage.fillEnvironmentForm('Test Env', 'Integration test environment')
    await environmentsPage.submitEnvironmentForm()
    await page.waitForTimeout(2000)

    // 4. Go back to home
    await homePage.goto()

    // 5. Create a task
    const taskDescription = 'Integration test task'
    await homePage.createTask(taskDescription)
    await page.waitForTimeout(2000)

    // 6. Open the task
    await homePage.clickTask(taskDescription)
    await expect(page).toHaveURL(/\/task\/[^\/]+/)

    // 7. Interact with the task
    const taskPage = new TaskPage(page, stagehand)
    await taskPage.sendMessage('Hello from integration test')
    await page.waitForTimeout(1000)

    // 8. Verify message appeared
    const messages = await taskPage.getMessages()
    expect(messages.some((msg) => msg.includes('Hello from integration test'))).toBeTruthy()

    // 9. Go back to home
    await taskPage.goBack()
    await expect(page).toHaveURL(/^.*\/$|^.*\/$/)

    // 10. Verify task still exists
    const tasks = await homePage.getVisibleTasks()
    expect(tasks.some((task) => task.includes(taskDescription))).toBeTruthy()
  })

  test('should handle concurrent task creation', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    const taskDescriptions = ['Concurrent Task 1', 'Concurrent Task 2', 'Concurrent Task 3']

    // Create multiple tasks quickly
    for (const description of taskDescriptions) {
      await homePage.createTask(description)
      await page.waitForTimeout(500) // Short delay between tasks
    }

    // Wait for all tasks to be created
    await page.waitForTimeout(3000)

    // Verify all tasks exist
    const tasks = await homePage.getVisibleTasks()
    for (const description of taskDescriptions) {
      expect(tasks.some((task) => task.includes(description))).toBeTruthy()
    }
  })

  test('should maintain state across navigation', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Set dark mode
    const initialDarkMode = await homePage.isDarkMode()
    if (!initialDarkMode) {
      await homePage.toggleTheme()
      await page.waitForTimeout(1000)
    }

    // Navigate to environments
    await homePage.goToEnvironments()

    // Navigate back to home
    await homePage.goto()

    // Verify dark mode is still active
    const darkModeAfterNavigation = await homePage.isDarkMode()
    expect(darkModeAfterNavigation).toBeTruthy()
  })

  test('should handle task interaction across multiple tabs', async ({
    page,
    stagehand,
    context,
  }) => {
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Create a task
    const taskDescription = 'Multi-tab test task'
    await homePage.createTask(taskDescription)
    await page.waitForTimeout(2000)

    // Click on task to navigate to detail page
    await homePage.clickTask(taskDescription)

    // Get current URL
    const taskUrl = page.url()

    // Open same task in new tab
    const newPage = await context.newPage()
    await newPage.goto(taskUrl)

    // Create Stagehand instance for new page
    const newStagehand = await require('../stagehand.config').createStagehand()
    const newTaskPage = new TaskPage(newPage, newStagehand)

    // Send message from first tab
    const taskPage = new TaskPage(page, stagehand)
    await taskPage.sendMessage('Message from tab 1')
    await page.waitForTimeout(1000)

    // Send message from second tab
    await newTaskPage.sendMessage('Message from tab 2')
    await newPage.waitForTimeout(1000)

    // Verify messages appear in both tabs
    const messages1 = await taskPage.getMessages()
    const messages2 = await newTaskPage.getMessages()

    expect(messages1.some((msg) => msg.includes('Message from tab 1'))).toBeTruthy()
    expect(messages2.some((msg) => msg.includes('Message from tab 2'))).toBeTruthy()

    // Clean up
    await newStagehand.close()
    await newPage.close()
  })

  test('should handle browser back and forward navigation', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Navigate to environments
    await homePage.goToEnvironments()
    await expect(page).toHaveURL(/\/environments/)

    // Use browser back button
    await page.goBack()
    await expect(page).toHaveURL(/^.*\/$|^.*\/$/)

    // Use browser forward button
    await page.goForward()
    await expect(page).toHaveURL(/\/environments/)

    // Create task and navigate to it
    await homePage.goto()
    const taskDescription = 'Navigation test task'
    await homePage.createTask(taskDescription)
    await page.waitForTimeout(2000)
    await homePage.clickTask(taskDescription)

    // Use browser back to return to home
    await page.goBack()
    await expect(page).toHaveURL(/^.*\/$|^.*\/$/)
  })

  test('should handle page refresh gracefully', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Create a task
    const taskDescription = 'Refresh test task'
    await homePage.createTask(taskDescription)
    await page.waitForTimeout(2000)

    // Navigate to task
    await homePage.clickTask(taskDescription)

    // Refresh the page
    await page.reload()
    await page.waitForTimeout(2000)

    // Verify page still works
    const taskPage = new TaskPage(page, stagehand)
    const isInputVisible = await taskPage.isMessageInputVisible()
    expect(isInputVisible).toBeTruthy()

    // Try sending a message after refresh
    await taskPage.sendMessage('Message after refresh')
    await page.waitForTimeout(1000)

    const messages = await taskPage.getMessages()
    expect(messages.some((msg) => msg.includes('Message after refresh'))).toBeTruthy()
  })

  test('should handle error states gracefully', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)

    // Try to navigate to invalid task ID
    await page.goto('http://localhost:3000/task/invalid-task-id')

    // Wait for error handling
    await page.waitForTimeout(2000)

    // Verify page doesn't crash (could show error message or redirect)
    const pageTitle = await page.title()
    expect(pageTitle).toBeTruthy()
  })

  test('should maintain accessibility standards', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Check for basic accessibility features
    // Focus management
    await page.keyboard.press('Tab')
    const focusedElement = await page.locator(':focus')
    expect(await focusedElement.count()).toBeGreaterThan(0)

    // Keyboard navigation
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // Verify navigation still works
    const isNavVisible = await homePage.isNavigationVisible()
    expect(isNavVisible).toBeTruthy()
  })

  test('should handle network interruptions', async ({ page, stagehand }) => {
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    // Create a task
    const taskDescription = 'Network test task'
    await homePage.createTask(taskDescription)
    await page.waitForTimeout(2000)

    // Navigate to task
    await homePage.clickTask(taskDescription)

    // Simulate network delay by intercepting requests
    await page.route('**/*', (route) => {
      setTimeout(() => route.continue(), 1000)
    })

    const taskPage = new TaskPage(page, stagehand)
    await taskPage.sendMessage('Message with network delay')

    // Wait longer for message with network delay
    await page.waitForTimeout(3000)

    // Verify message eventually appears
    const messages = await taskPage.getMessages()
    expect(messages.some((msg) => msg.includes('Message with network delay'))).toBeTruthy()
  })
})
