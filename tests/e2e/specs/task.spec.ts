import { test, expect } from '../fixtures/base.fixture'
import { HomePage } from '../page-objects/home.page'
import { TaskPage } from '../page-objects/task.page'

test.describe('Task Detail Page', () => {
  let taskId: string

  test.beforeEach(async ({ page, stagehand }) => {
    // Create a task first and get its ID
    const homePage = new HomePage(page, stagehand)
    await homePage.goto()

    const taskDescription = 'E2E Test Task'
    await homePage.createTask(taskDescription)

    // Wait for task creation and navigation
    await page.waitForTimeout(2000)

    // Click on the created task to get the task ID
    await homePage.clickTask(taskDescription)

    // Extract task ID from URL
    const currentUrl = page.url()
    const urlMatch = currentUrl.match(/\/task\/([^\/]+)/)
    taskId = urlMatch ? urlMatch[1] : ''

    expect(taskId).toBeTruthy()
  })

  test('should display task detail page correctly', async ({ page, stagehand }) => {
    const taskPage = new TaskPage(page, stagehand)

    // Verify we're on the task page
    await expect(page).toHaveURL(/\/task\/[^\/]+/)

    // Check if page loaded correctly
    await expect(page).toHaveTitle(/Codex Clone/)

    // Verify task title is visible
    const taskTitle = await taskPage.getTaskTitle()
    expect(taskTitle).toBeTruthy()
    expect(taskTitle.length).toBeGreaterThan(0)
  })

  test('should display message input correctly', async ({ page, stagehand }) => {
    const taskPage = new TaskPage(page, stagehand)

    // Verify message input is visible
    const isInputVisible = await taskPage.isMessageInputVisible()
    expect(isInputVisible).toBeTruthy()
  })

  test('should send and receive messages', async ({ page, stagehand }) => {
    const taskPage = new TaskPage(page, stagehand)

    // Send a message
    const testMessage = 'Hello, this is a test message from AI!'
    await taskPage.sendMessage(testMessage)

    // Wait for message to be processed
    await page.waitForTimeout(1000)

    // Verify message appears in the chat
    const messages = await taskPage.getMessages()
    expect(messages.some((msg) => msg.includes(testMessage))).toBeTruthy()
  })

  test('should handle streaming responses', async ({ page, stagehand }) => {
    const taskPage = new TaskPage(page, stagehand)

    // Send a message that might trigger streaming
    const complexMessage = 'Generate a simple React component for me'
    await taskPage.sendMessage(complexMessage)

    // Wait for streaming to start
    await page.waitForTimeout(1000)

    // Check if streaming indicator appears
    const isStreaming = await taskPage.isStreamingIndicatorVisible()

    // If streaming, wait for it to complete
    if (isStreaming) {
      await taskPage.waitForStreamingComplete()
    }

    // Verify response was received
    const lastMessage = await taskPage.getLastMessage()
    expect(lastMessage).toBeTruthy()
    expect(lastMessage.length).toBeGreaterThan(0)
  })

  test('should handle code blocks in responses', async ({ page, stagehand }) => {
    const taskPage = new TaskPage(page, stagehand)

    // Send a message requesting code
    const codeRequest = 'Write a simple JavaScript function'
    await taskPage.sendMessage(codeRequest)

    // Wait for response
    await page.waitForTimeout(3000)

    // Check if code block is present
    const hasCode = await taskPage.hasCodeBlock()

    // If code block is present, test copy functionality
    if (hasCode) {
      await taskPage.copyCodeBlock()
      // Wait for copy action
      await page.waitForTimeout(500)
    }

    // Verify response contains meaningful content
    const lastMessage = await taskPage.getLastMessage()
    expect(lastMessage).toBeTruthy()
  })

  test('should navigate back to home', async ({ page, stagehand }) => {
    const taskPage = new TaskPage(page, stagehand)

    // Go back to home
    await taskPage.goBack()

    // Verify navigation to home page
    await expect(page).toHaveURL(/^.*\/$|^.*\/$/)
  })

  test('should handle multiple messages in sequence', async ({ page, stagehand }) => {
    const taskPage = new TaskPage(page, stagehand)

    const messages = ['First message', 'Second message', 'Third message']

    for (const message of messages) {
      await taskPage.sendMessage(message)
      await page.waitForTimeout(1000)
    }

    // Verify all messages appear
    const allMessages = await taskPage.getMessages()
    for (const message of messages) {
      expect(allMessages.some((msg) => msg.includes(message))).toBeTruthy()
    }
  })

  test('should handle empty message input', async ({ page, stagehand }) => {
    const taskPage = new TaskPage(page, stagehand)

    // Try to send empty message
    await taskPage.sendMessage('')

    // Wait a moment
    await page.waitForTimeout(1000)

    // Verify no empty message was sent
    const messages = await taskPage.getMessages()
    expect(messages.every((msg) => msg.trim().length > 0)).toBeTruthy()
  })

  test('should handle very long messages', async ({ page, stagehand }) => {
    const taskPage = new TaskPage(page, stagehand)

    // Send a very long message
    const longMessage = 'This is a very long message. '.repeat(100)
    await taskPage.sendMessage(longMessage)

    // Wait for message processing
    await page.waitForTimeout(2000)

    // Verify message was handled
    const messages = await taskPage.getMessages()
    expect(messages.some((msg) => msg.includes('This is a very long message'))).toBeTruthy()
  })

  test('should maintain responsive design on mobile', async ({ page, stagehand }) => {
    const taskPage = new TaskPage(page, stagehand)

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Verify message input still works on mobile
    const isInputVisible = await taskPage.isMessageInputVisible()
    expect(isInputVisible).toBeTruthy()

    // Test sending message on mobile
    await taskPage.sendMessage('Mobile test message')
    await page.waitForTimeout(1000)

    // Verify message appears
    const messages = await taskPage.getMessages()
    expect(messages.some((msg) => msg.includes('Mobile test message'))).toBeTruthy()
  })

  test('should handle special characters in messages', async ({ page, stagehand }) => {
    const taskPage = new TaskPage(page, stagehand)

    // Send message with special characters
    const specialMessage = 'Test with special chars: !@#$%^&*()_+{}[]|\\:";\'<>?,./`~'
    await taskPage.sendMessage(specialMessage)

    // Wait for message processing
    await page.waitForTimeout(1000)

    // Verify message was handled correctly
    const messages = await taskPage.getMessages()
    expect(messages.some((msg) => msg.includes('Test with special chars'))).toBeTruthy()
  })
})
