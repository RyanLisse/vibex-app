import { Page } from '@playwright/test'
import { Stagehand } from 'stagehand'
import { BasePage } from './base.page'

/**
 * Environments page object model
 */
export class EnvironmentsPage extends BasePage {
  constructor(page: Page, stagehand: Stagehand) {
    super(page, stagehand)
  }

  /**
   * Navigate to the environments page
   */
  async goto() {
    await super.goto('/environments')
  }

  /**
   * Check if the create environment dialog is visible
   */
  async isCreateDialogVisible(): Promise<boolean> {
    return await this.aiObserve('create environment dialog is visible')
  }

  /**
   * Open the create environment dialog
   */
  async openCreateDialog(): Promise<void> {
    await this.aiClick('create environment button')
  }

  /**
   * Close the create environment dialog
   */
  async closeCreateDialog(): Promise<void> {
    await this.aiClick('close dialog button')
  }

  /**
   * Fill environment creation form
   */
  async fillEnvironmentForm(name: string, description: string): Promise<void> {
    await this.aiFill('environment name input field', name)
    await this.aiFill('environment description input field', description)
  }

  /**
   * Submit environment creation form
   */
  async submitEnvironmentForm(): Promise<void> {
    await this.aiClick('create environment submit button')
  }

  /**
   * Get all visible environments
   */
  async getVisibleEnvironments(): Promise<string[]> {
    const environmentsText = await this.aiExtract('all environment items text')
    return environmentsText.split('\n').filter((env) => env.trim().length > 0)
  }

  /**
   * Click on a specific environment
   */
  async clickEnvironment(environmentName: string): Promise<void> {
    await this.aiClick(`environment item containing "${environmentName}"`)
  }

  /**
   * Check if an environment exists
   */
  async environmentExists(environmentName: string): Promise<boolean> {
    return await this.aiObserve(`environment with name "${environmentName}" exists`)
  }

  /**
   * Delete an environment
   */
  async deleteEnvironment(environmentName: string): Promise<void> {
    await this.aiClick(`delete button for environment "${environmentName}"`)
    await this.aiClick('confirm delete button')
  }
}
