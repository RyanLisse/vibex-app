import { test, expect } from '@playwright/test'

test.describe('Basic E2E Setup Verification', () => {
  test('playwright is properly configured', async () => {
    // This test verifies that Playwright is set up correctly
    expect(true).toBe(true)
  })

  test('can create a browser context', async ({ browser }) => {
    const context = await browser.newContext()
    expect(context).toBeDefined()
    await context.close()
  })

  test('can create a page', async ({ page }) => {
    expect(page).toBeDefined()
    expect(page.goto).toBeDefined()
  })

  test('can navigate to a URL', async ({ page }) => {
    // Navigate to example.com as a test
    await page.goto('https://example.com')
    await expect(page).toHaveTitle(/Example Domain/)
  })

  test('can take screenshots', async ({ page }) => {
    await page.goto('https://example.com')
    const screenshot = await page.screenshot()
    expect(screenshot).toBeDefined()
    expect(screenshot.length).toBeGreaterThan(0)
  })

  test('can interact with page elements', async ({ page }) => {
    await page.goto('https://example.com')
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    await expect(heading).toHaveText('Example Domain')
  })

  test('viewport settings work correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    const viewportSize = page.viewportSize()
    expect(viewportSize).toEqual({ width: 1280, height: 720 })
  })

  test('can handle multiple browser contexts', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    expect(page1).toBeDefined()
    expect(page2).toBeDefined()

    await context1.close()
    await context2.close()
  })
})
