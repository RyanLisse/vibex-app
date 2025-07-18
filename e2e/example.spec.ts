import { expect, test } from '@playwright/test'

test('should display the homepage', async ({ page }) => {
  await page.goto('/')

  // Check that the page has loaded
  await expect(page).toHaveTitle(/VibeKit/)

  // Add more specific tests based on your actual homepage content
})

test('should navigate to different pages', async ({ page }) => {
  await page.goto('/')

  // Example: clicking a navigation link
  // await page.click('text=About')
  // await expect(page).toHaveURL('/about')
})

test('should not have any automatically detectable accessibility issues', async ({ page }) => {
  await page.goto('/')

  // This is a basic check - consider using @axe-core/playwright for more thorough testing
  const accessibilityTree = await page.accessibility.snapshot()
  expect(accessibilityTree).toBeTruthy()
})
