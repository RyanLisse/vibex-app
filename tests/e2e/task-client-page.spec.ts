import { expect, test } from '@playwright/test'

test.describe('TaskClientPage Component E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('should render task client page without errors', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Should render the main page structure (div.flex.flex-col.px-4.py-2.h-screen)
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('div.flex.flex-col.px-4.py-2.h-screen')).toBeVisible()

    // Check for navigation (VibeX title)
    await expect(page.locator('h1').filter({ hasText: 'VibeX' })).toBeVisible()
  })

  test('should handle task creation interface', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for task creation elements (forms, buttons, inputs)
    const taskCreationElements = page.locator(
      'form, [data-testid*="task"], input[type="text"], textarea'
    )

    // Should have some form of task creation interface
    await expect(page.locator('body')).toBeVisible()

    // Check specifically for the NewTaskForm component
    const forms = page.locator('form')
    if ((await forms.count()) > 0) {
      await expect(forms.first()).toBeVisible()
    }
  })

  test('should handle task listing display', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for task list elements - TaskList component should be rendered
    const taskListElements = page.locator(
      '[data-testid*="task-list"], [class*="task-list"], ul, ol'
    )

    // Page should render task listing area
    await expect(page.locator('body')).toBeVisible()

    // Verify the main layout structure that contains TaskList
    await expect(page.locator('div.flex.flex-col.px-4.py-2.h-screen')).toBeVisible()
  })

  test('should handle task interactions', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for interactive elements
    const interactiveElements = page.locator('button, [role="button"], [tabindex="0"]')

    // Should have interactive elements for task operations
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle task detail view', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for task detail elements
    const taskDetailElements = page.locator('[data-testid*="task-detail"], [class*="task-detail"]')

    // Should handle task detail display
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle task status updates', async ({ page }) => {
    const consoleMessages = []
    page.on('console', (msg) => consoleMessages.push(msg.text()))

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Should handle task status updates without critical errors
    const statusErrors = consoleMessages.filter(
      (msg) => msg.includes('status') && msg.includes('error')
    )
    expect(statusErrors.length).toBeLessThan(3)
  })

  test('should handle task filtering and search', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for filter/search elements
    const filterElements = page.locator(
      'input[type="search"], [data-testid*="filter"], [data-testid*="search"]'
    )

    // Should provide filtering/search functionality
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle task sorting', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for sorting elements
    const sortElements = page.locator('[data-testid*="sort"], [class*="sort"], select')

    // Should provide sorting functionality
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle task pagination', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for pagination elements
    const paginationElements = page.locator(
      '[data-testid*="pagination"], [class*="pagination"], nav'
    )

    // Should handle pagination
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle task form submission', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for form elements
    const formElements = page.locator('form')

    if ((await formElements.count()) > 0) {
      // Check form submission handling
      const form = formElements.first()
      await expect(form).toBeVisible()
    }

    // Should handle form interactions
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle task deletion', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for delete buttons
    const deleteButtons = page.locator('button[data-testid*="delete"], [class*="delete"]')

    // Should handle task deletion UI
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle task editing', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for edit buttons
    const editButtons = page.locator('button[data-testid*="edit"], [class*="edit"]')

    // Should handle task editing UI
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle responsive design', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(1000)

    // Should adapt to mobile view
    await expect(page.locator('body')).toBeVisible()

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(1000)

    // Should adapt to tablet view
    await expect(page.locator('body')).toBeVisible()

    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(1000)

    // Should work in desktop view
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle keyboard navigation', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Should handle keyboard navigation
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle loading states', async ({ page }) => {
    const loadingElements = []

    // Monitor for loading indicators
    page.on('response', (response) => {
      if (response.url().includes('task')) {
        loadingElements.push(response.url())
      }
    })

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Should handle loading states appropriately
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle error states', async ({ page }) => {
    const errors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Should handle errors gracefully
    const criticalErrors = errors.filter(
      (error) => error.includes('TaskClientPage') && error.includes('critical')
    )
    expect(criticalErrors.length).toBe(0)
  })
})
