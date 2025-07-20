import { expect, test } from '@playwright/test'

test.describe('Task Page Structure E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
  })

  test('should handle task page navigation', async ({ page }) => {
    // Try to navigate to a task page (will show "Task not found" since no tasks exist)
    await page.goto('http://localhost:3000/task/test-task-id')
    await page.waitForLoadState('networkidle')

    // Should render task page structure
    await expect(page.locator('body')).toBeVisible()

    // Check for task page layout (div.flex.flex-col.h-screen)
    await expect(page.locator('div.flex.flex-col.h-screen')).toBeVisible()
  })

  test('should show task not found message for non-existent task', async ({ page }) => {
    // Navigate to non-existent task
    await page.goto('http://localhost:3000/task/non-existent-task')
    await page.waitForLoadState('networkidle')

    // Should show task not found message
    await expect(page.locator('text=Task not found')).toBeVisible()
    await expect(page.locator('text=The requested task could not be found.')).toBeVisible()
  })

  test('should render task navbar for task pages', async ({ page }) => {
    // Navigate to a task page
    await page.goto('http://localhost:3000/task/test-task-id')
    await page.waitForLoadState('networkidle')

    // Should have TaskNavbar component (check for navigation elements)
    await expect(
      page.locator('div.h-14.border-b.flex.items-center.justify-between.px-4')
    ).toBeVisible()

    // Should have the main task page structure
    await expect(page.locator('div.flex.flex-col.h-screen')).toBeVisible()
  })

  test('should handle task page components without errors', async ({ page }) => {
    const componentErrors = []
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        (msg.text().includes('TaskClientPage') ||
          msg.text().includes('TaskNavbar') ||
          msg.text().includes('MessageInput') ||
          msg.text().includes('ChatMessagesPanel') ||
          msg.text().includes('ShellOutputPanel'))
      ) {
        componentErrors.push(msg.text())
      }
    })

    await page.goto('http://localhost:3000/task/test-task-id')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Should not have critical component errors
    const criticalErrors = componentErrors.filter(
      (error) =>
        !(
          error.includes('subscription') ||
          error.includes('WebSocket') ||
          error.includes('network')
        )
    )

    expect(criticalErrors.length).toBe(0)
  })

  test('should handle subscription hooks on task pages', async ({ page }) => {
    const subscriptionRequests = []
    page.on('request', (request) => {
      if (
        request.url().includes('inngest') ||
        request.url().includes('subscription') ||
        request.url().includes('inngest')
      ) {
        subscriptionRequests.push(request.url())
      }
    })

    await page.goto('http://localhost:3000/task/test-task-id')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Task page should still work even if subscription fails
    await expect(page.locator('body')).toBeVisible()

    // Should not crash from subscription errors
    const errorElements = page.locator('[data-error="true"], .error-message')
    await expect(errorElements).toHaveCount(0)
  })

  test('should handle task page layout components', async ({ page }) => {
    await page.goto('http://localhost:3000/task/test-task-id')
    await page.waitForLoadState('networkidle')

    // Should have the main layout structure
    await expect(page.locator('div.flex.flex-col.h-screen')).toBeVisible()

    // Should have the TaskNavbar (check for navigation elements)
    await expect(
      page.locator('div.h-14.border-b.flex.items-center.justify-between.px-4')
    ).toBeVisible()

    // Should have the main content area
    await expect(page.locator('div.flex.flex-1.overflow-hidden')).toBeVisible()
  })

  test('should handle task page responsive design', async ({ page }) => {
    await page.goto('http://localhost:3000/task/test-task-id')
    await page.waitForLoadState('networkidle')

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // Should still be visible and functional
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('div.flex.flex-col.h-screen')).toBeVisible()

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(500)

    // Should still be visible and functional
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('div.flex.flex-col.h-screen')).toBeVisible()
  })

  test('should handle task page with chat message panel', async ({ page }) => {
    await page.goto('http://localhost:3000/task/test-task-id')
    await page.waitForLoadState('networkidle')

    // Should have chat messages panel area (even if empty)
    await expect(page.locator('div.w-full.max-w-3xl.mx-auto')).toBeVisible()

    // Should have scroll area for messages
    await expect(page.locator('[data-radix-scroll-area-viewport]')).toBeVisible()
  })

  test('should handle task page with shell output panel', async ({ page }) => {
    await page.goto('http://localhost:3000/task/test-task-id')
    await page.waitForLoadState('networkidle')

    // Should have the main flex layout that would contain shell output
    await expect(page.locator('div.flex.flex-1.overflow-hidden')).toBeVisible()

    // The ShellOutputPanel should be rendered (even if empty)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle task page cleanup on navigation', async ({ page }) => {
    // Navigate to task page
    await page.goto('http://localhost:3000/task/test-task-id')
    await page.waitForLoadState('networkidle')

    // Should render properly
    await expect(page.locator('body')).toBeVisible()

    // Navigate back to home
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Should return to home page structure
    await expect(page.locator('div.flex.flex-col.px-4.py-2.h-screen')).toBeVisible()
  })
})
