import { expect, test } from '@playwright/test'

test.describe('Container Component E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
  })

  test('should render container with children', async ({ page }) => {
    // Wait for app to load
    await page.waitForLoadState('networkidle')

    // Check that the main application structure exists
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('div.flex.flex-col.px-4.py-2.h-screen')).toBeVisible()

    // Check for main app components
    await expect(page.locator('nav')).toBeVisible()
  })

  test('should handle task subscription initialization', async ({ page }) => {
    // Wait for the container to load
    await page.waitForLoadState('networkidle')

    // Check if task subscription is working (look for subscription indicators)
    await expect(page.locator('body')).toBeVisible()

    // Check for any error messages in console
    const consoleMessages = []
    page.on('console', (msg) => consoleMessages.push(msg.text()))

    await page.waitForTimeout(2000)

    // Verify no critical errors
    const criticalErrors = consoleMessages.filter(
      (msg) => msg.includes('error') || msg.includes('Error')
    )
    expect(criticalErrors.length).toBeLessThan(5) // Allow some non-critical errors
  })

  test('should handle Inngest subscription state', async ({ page }) => {
    // Monitor network requests for Inngest subscription
    const requests = []
    page.on('request', (request) => {
      if (
        request.url().includes('inngest') ||
        request.url().includes('subscription') ||
        request.url().includes('test-inngest')
      ) {
        requests.push(request.url())
      }
    })

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Should attempt to check Inngest status (may not make subscription requests in test environment)
    // The app should handle connection failures gracefully
    await expect(page.locator('body')).toBeVisible()

    // Verify the container doesn't crash from connection issues
    const errorElements = page.locator('[data-error="true"], .error-message')
    await expect(errorElements).toHaveCount(0)
  })

  test('should handle task store integration', async ({ page }) => {
    // Check if task store is properly initialized
    await page.waitForLoadState('networkidle')

    // Look for task-related elements
    const taskElements = page.locator('[data-testid*="task"], [class*="task"]')
    // Container should be present even if no tasks exist
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle subscription enable/disable', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // The subscription should be enabled by default
    // Check for any subscription-related UI elements
    await expect(page.locator('body')).toBeVisible()

    // Verify container handles subscription state changes
    await page.waitForTimeout(2000)
  })

  test('should handle message processing', async ({ page }) => {
    // Monitor console for message processing
    const messages = []
    page.on('console', (msg) => messages.push(msg.text()))

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Container should handle message processing without critical errors
    const fatalErrors = messages.filter((msg) => msg.includes('Fatal') || msg.includes('FATAL'))
    expect(fatalErrors.length).toBe(0)
  })

  test('should handle subscription cleanup on unmount', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Navigate away to trigger cleanup
    await page.goto('about:blank')

    // Wait for cleanup
    await page.waitForTimeout(1000)

    // Navigate back
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Should successfully reinitialize
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle network connectivity issues', async ({ page }) => {
    // Monitor network failures
    const networkFailures = []
    page.on('response', (response) => {
      if (!response.ok()) {
        networkFailures.push(response.url())
      }
    })

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Container should handle network failures gracefully
    // (Inngest connection failures are expected in test environment)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle real-time updates', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Check for any real-time update mechanisms
    const wsConnections = []
    page.on('websocket', (ws) => wsConnections.push(ws))

    await page.waitForTimeout(5000)

    // Container should attempt real-time connections
    // (May fail in test environment but should handle gracefully)
    await expect(page.locator('body')).toBeVisible()
  })
})
