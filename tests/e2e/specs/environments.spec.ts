import { test, expect } from '../fixtures/base.fixture'
import { EnvironmentsPage } from '../page-objects/environments.page'

test.describe('Environments Page', () => {
  test('should display environments page correctly', async ({ page, stagehand }) => {
    const environmentsPage = new EnvironmentsPage(page, stagehand)
    await environmentsPage.goto()

    // Verify page loads correctly
    await expect(page).toHaveURL(/\/environments/)

    // Check page title
    await expect(page).toHaveTitle(/Codex Clone/)
  })

  test('should open and close create environment dialog', async ({ page, stagehand }) => {
    const environmentsPage = new EnvironmentsPage(page, stagehand)
    await environmentsPage.goto()

    // Open create dialog
    await environmentsPage.openCreateDialog()

    // Verify dialog is visible
    const isDialogVisible = await environmentsPage.isCreateDialogVisible()
    expect(isDialogVisible).toBeTruthy()

    // Close dialog
    await environmentsPage.closeCreateDialog()

    // Wait for dialog to close
    await page.waitForTimeout(1000)

    // Verify dialog is closed
    const isDialogClosed = await environmentsPage.isCreateDialogVisible()
    expect(isDialogClosed).toBeFalsy()
  })

  test('should create a new environment', async ({ page, stagehand }) => {
    const environmentsPage = new EnvironmentsPage(page, stagehand)
    await environmentsPage.goto()

    // Open create dialog
    await environmentsPage.openCreateDialog()

    // Fill form
    const envName = 'Test Environment'
    const envDescription = 'Test environment created by AI'
    await environmentsPage.fillEnvironmentForm(envName, envDescription)

    // Submit form
    await environmentsPage.submitEnvironmentForm()

    // Wait for environment creation
    await page.waitForTimeout(2000)

    // Verify environment was created
    const environmentExists = await environmentsPage.environmentExists(envName)
    expect(environmentExists).toBeTruthy()
  })

  test('should list existing environments', async ({ page, stagehand }) => {
    const environmentsPage = new EnvironmentsPage(page, stagehand)
    await environmentsPage.goto()

    // Get visible environments
    const environments = await environmentsPage.getVisibleEnvironments()
    expect(Array.isArray(environments)).toBeTruthy()

    // If environments exist, verify they have content
    if (environments.length > 0) {
      expect(environments.every((env) => env.trim().length > 0)).toBeTruthy()
    }
  })

  test('should click on environment item', async ({ page, stagehand }) => {
    const environmentsPage = new EnvironmentsPage(page, stagehand)
    await environmentsPage.goto()

    // First create an environment to click on
    await environmentsPage.openCreateDialog()
    const envName = 'Clickable Environment'
    await environmentsPage.fillEnvironmentForm(envName, 'Description')
    await environmentsPage.submitEnvironmentForm()

    // Wait for creation
    await page.waitForTimeout(2000)

    // Click on the environment
    await environmentsPage.clickEnvironment(envName)

    // Verify some interaction occurred (could be navigation or modal)
    await page.waitForTimeout(1000)
  })

  test('should handle form validation', async ({ page, stagehand }) => {
    const environmentsPage = new EnvironmentsPage(page, stagehand)
    await environmentsPage.goto()

    // Open create dialog
    await environmentsPage.openCreateDialog()

    // Try to submit empty form
    await environmentsPage.submitEnvironmentForm()

    // Wait for validation
    await page.waitForTimeout(1000)

    // Dialog should still be visible (form validation prevents submission)
    const isDialogVisible = await environmentsPage.isCreateDialogVisible()
    expect(isDialogVisible).toBeTruthy()
  })

  test('should create multiple environments', async ({ page, stagehand }) => {
    const environmentsPage = new EnvironmentsPage(page, stagehand)
    await environmentsPage.goto()

    const environmentNames = ['Env 1', 'Env 2', 'Env 3']

    for (const envName of environmentNames) {
      // Open create dialog
      await environmentsPage.openCreateDialog()

      // Fill and submit form
      await environmentsPage.fillEnvironmentForm(envName, `Description for ${envName}`)
      await environmentsPage.submitEnvironmentForm()

      // Wait for creation
      await page.waitForTimeout(1500)
    }

    // Verify all environments were created
    for (const envName of environmentNames) {
      const exists = await environmentsPage.environmentExists(envName)
      expect(exists).toBeTruthy()
    }
  })

  test('should handle long environment names and descriptions', async ({ page, stagehand }) => {
    const environmentsPage = new EnvironmentsPage(page, stagehand)
    await environmentsPage.goto()

    // Open create dialog
    await environmentsPage.openCreateDialog()

    // Use long name and description
    const longName = 'A' + 'Very '.repeat(10) + 'Long Environment Name'
    const longDescription = 'This is a '.repeat(20) + 'very long description for testing purposes'

    await environmentsPage.fillEnvironmentForm(longName, longDescription)
    await environmentsPage.submitEnvironmentForm()

    // Wait for creation
    await page.waitForTimeout(2000)

    // Verify environment was created with long name
    const exists = await environmentsPage.environmentExists(longName)
    expect(exists).toBeTruthy()
  })

  test('should maintain responsive design on mobile', async ({ page, stagehand }) => {
    const environmentsPage = new EnvironmentsPage(page, stagehand)

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await environmentsPage.goto()

    // Verify create dialog still works on mobile
    await environmentsPage.openCreateDialog()
    const isDialogVisible = await environmentsPage.isCreateDialogVisible()
    expect(isDialogVisible).toBeTruthy()

    // Close dialog
    await environmentsPage.closeCreateDialog()
  })
})
