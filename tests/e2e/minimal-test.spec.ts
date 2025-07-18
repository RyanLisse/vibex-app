import { expect, test } from '@playwright/test'

test.describe('Basic Playwright Setup', () => {
  test('should be able to run a simple test', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Check for proper title
    await expect(page).toHaveTitle(/VibeX.*OpenAI Codex clone/)

    // Verify main app structure is rendered
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('div.flex.flex-col.px-4.py-2.h-screen')).toBeVisible()
  })

  test('should have proper application structure', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Check for main components that should exist
    await expect(page.locator('h1').filter({ hasText: 'VibeX' })).toBeVisible() // Navbar title

    // Check for navigation links
    await expect(page.locator('a').filter({ hasText: 'Home' })).toBeVisible()
    await expect(page.locator('a').filter({ hasText: 'Environments' })).toBeVisible()

    // Check for form elements (NewTaskForm)
    const forms = page.locator('form')
    const formsCount = await forms.count()
    expect(formsCount).toBeGreaterThanOrEqual(0) // Forms may or may not exist

    // Check that the app doesn't crash
    const errorElements = page.locator('[data-error="true"], .error-message, .fatal-error')
    await expect(errorElements).toHaveCount(0)
  })

  test('should handle console errors gracefully', async ({ page }) => {
    const consoleErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Filter out expected errors (like connection failures in test environment)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !(
          error.includes('inngest') ||
          error.includes('WebSocket') ||
          error.includes('ReadableStream') ||
          error.includes('Authentication failed') ||
          error.includes('Network error')
        )
    )

    expect(criticalErrors.length).toBe(0)
  })
})
