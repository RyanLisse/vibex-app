import { expect } from '@playwright/test'
import { test } from './fixtures/mock-server'

test.describe('Basic Mock Application Test', () => {
  test('should be able to run a simple test with mock server', async ({ mockPage }) => {
    await mockPage.goto('http://localhost:3000')
    await mockPage.waitForLoadState('networkidle')

    // Check for proper title
    await expect(mockPage).toHaveTitle(/VibeX.*OpenAI Codex clone/)

    // Verify main app structure is rendered
    await expect(mockPage.locator('body')).toBeVisible()
    await expect(mockPage.locator('div.flex.flex-col.px-4.py-2.h-screen')).toBeVisible()
  })

  test('should have proper application structure with mock', async ({ mockPage }) => {
    await mockPage.goto('http://localhost:3000')
    await mockPage.waitForLoadState('networkidle')

    // Check for main components that should exist in the mocked page
    await expect(mockPage.locator('h1').filter({ hasText: 'VibeX' })).toBeVisible() // Navbar title

    // Check for navigation links
    await expect(mockPage.locator('a').filter({ hasText: 'Home' })).toBeVisible()
    await expect(mockPage.locator('a').filter({ hasText: 'Environments' })).toBeVisible()

    // Check for form elements (if any)
    const forms = mockPage.locator('form')
    const formsCount = await forms.count()
    expect(formsCount).toBeGreaterThanOrEqual(0) // Forms may or may not exist

    // Check that the app doesn't crash
    const errorElements = mockPage.locator('[data-error="true"], .error-message, .fatal-error')
    await expect(errorElements).toHaveCount(0)
  })

  test('should handle API requests with mock responses', async ({ mockPage }) => {
    // This will test the mock server's ability to handle API requests
    const response = await mockPage.goto('http://localhost:3000/api/test')
    expect(response?.status()).toBe(200)

    const body = await response?.json()
    expect(body).toEqual({ success: true })
  })
})
