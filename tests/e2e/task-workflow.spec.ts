import { test, expect } from '@playwright/test'

test.describe('Task Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('creates and executes a task', async ({ page }) => {
    // Navigate to task creation
    await page.getByText('New Task').click()

    // Fill in task details
    await page.getByPlaceholder('Describe your task').fill('Create a simple React component')
    await page.selectOption('select[name="repository"]', 'user/test-repo')
    await page.selectOption('select[name="environment"]', 'node')

    // Submit the task
    await page.getByRole('button', { name: 'Create Task' }).click()

    // Verify task was created
    await expect(page.getByText('Task created successfully')).toBeVisible()

    // Wait for task to appear in the list
    await expect(page.getByText('Create a simple React component')).toBeVisible()

    // Check task status updates
    await expect(page.getByText('pending')).toBeVisible()

    // Wait for task to start processing
    await expect(page.getByText('running')).toBeVisible({ timeout: 10000 })
  })

  test('displays task progress updates', async ({ page }) => {
    // Create a task
    await page.getByText('New Task').click()
    await page.getByPlaceholder('Describe your task').fill('Generate API documentation')
    await page.getByRole('button', { name: 'Create Task' }).click()

    // Click on the task to view details
    await page.getByText('Generate API documentation').click()

    // Verify task details page
    await expect(page.getByText('Task Details')).toBeVisible()
    await expect(page.getByText('Generate API documentation')).toBeVisible()

    // Check for progress updates
    await expect(page.getByText('Analyzing requirements')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Generating code')).toBeVisible({ timeout: 10000 })
  })

  test('handles task errors gracefully', async ({ page }) => {
    // Create a task with invalid parameters
    await page.getByText('New Task').click()
    await page.getByPlaceholder('Describe your task').fill('')
    await page.getByRole('button', { name: 'Create Task' }).click()

    // Verify error message
    await expect(page.getByText('Task description is required')).toBeVisible()
  })

  test('filters and searches tasks', async ({ page }) => {
    // Assume tasks already exist
    await page.goto('/tasks')

    // Test search functionality
    await page.getByPlaceholder('Search tasks').fill('React')
    await page.keyboard.press('Enter')

    // Verify filtered results
    await expect(page.getByText('React')).toBeVisible()

    // Test status filter
    await page.selectOption('select[name="status"]', 'completed')
    await expect(page.getByText('completed')).toBeVisible()
  })

  test('responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Verify mobile navigation
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
    await page.getByRole('button', { name: 'Menu' }).click()

    // Verify mobile menu items
    await expect(page.getByText('Tasks')).toBeVisible()
    await expect(page.getByText('Environments')).toBeVisible()
  })
})
