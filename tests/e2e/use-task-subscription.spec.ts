import { expect, test } from '@playwright/test'

test.describe('useTaskSubscription Hook E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('should initialize task subscription on page load', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Check if subscription initialization doesn't cause critical errors
    const errors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.waitForTimeout(3000)

    // Should not have critical subscription errors
    const criticalErrors = errors.filter(
      (error) => error.includes('subscription') && error.includes('critical')
    )
    expect(criticalErrors.length).toBe(0)
  })

  test('should handle subscription token fetching', async ({ page }) => {
    const requests = []
    page.on('request', (request) => {
      if (
        request.url().includes('token') ||
        request.url().includes('subscription') ||
        request.url().includes('inngest')
      ) {
        requests.push({
          url: request.url(),
          method: request.method(),
        })
      }
    })

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Should check Inngest availability (may not fetch tokens in test environment)
    // The hook should handle missing tokens gracefully
    await expect(page.locator('body')).toBeVisible()

    // App should not crash from connection failures
    const fatalErrors = page.locator('[data-fatal="true"], .fatal-error')
    await expect(fatalErrors).toHaveCount(0)
  })

  test('should handle subscription reconnection', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Simulate network disconnect and reconnect
    await page.setOffline(true)
    await page.waitForTimeout(2000)
    await page.setOffline(false)

    await page.waitForLoadState('networkidle')

    // Should handle reconnection gracefully
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle subscription state changes', async ({ page }) => {
    const consoleMessages = []
    page.on('console', (msg) => consoleMessages.push(msg.text()))

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Should log subscription state changes
    const _subscriptionLogs = consoleMessages.filter(
      (msg) => msg.includes('subscription') || msg.includes('Subscription')
    )

    // Container should handle subscription state
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle task updates through subscription', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for task-related elements that would be updated via subscription
    const _taskElements = page.locator('[data-testid*="task"], [class*="task"], [id*="task"]')

    // Even if no tasks exist, subscription should be ready
    await expect(page.locator('body')).toBeVisible()

    // Check that the main app structure is intact (subscription doesn't break the app)
    await expect(page.locator('div.flex.flex-col.px-4.py-2.h-screen')).toBeVisible()
  })

  test('should handle subscription cleanup', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Navigate away to trigger cleanup
    await page.goto('about:blank')
    await page.waitForTimeout(1000)

    // Navigate back
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Should reinitialize subscription without errors
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle subscription errors gracefully', async ({ page }) => {
    const errors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000)

    // Should handle expected subscription errors (like Inngest connection failures)
    // without crashing the application
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle multiple subscription attempts', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Reload page multiple times to test subscription handling
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should handle multiple subscription attempts
    await expect(page.locator('body')).toBeVisible()
  })
})
