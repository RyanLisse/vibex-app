import { Page } from '@playwright/test'
import { Stagehand } from 'stagehand'
import { BasePage } from './base.page'

/**
 * Home page object model
 */
export class HomePage extends BasePage {
  constructor(page: Page, stagehand: Stagehand) {
    super(page, stagehand)
  }

  /**
   * Navigate to the home page
   */
  async goto() {
    await super.goto('/')
  }

  /**
   * Get the main heading text
   */
  async getMainHeading(): Promise<string> {
    return await this.aiExtract('the main heading text on the page')
  }

  /**
   * Check if the navigation is visible
   */
  async isNavigationVisible(): Promise<boolean> {
    return await this.aiObserve('navigation menu is visible')
  }

  /**
   * Click on the theme toggle
   */
  async toggleTheme(): Promise<void> {
    await this.aiClick('theme toggle button')
  }

  /**
   * Check if dark mode is active
   */
  async isDarkMode(): Promise<boolean> {
    return await this.aiObserve('page is in dark mode')
  }

  /**
   * Navigate to environments page
   */
  async goToEnvironments(): Promise<void> {
    await this.aiClick('environments link in navigation')
  }

  /**
   * Check if the task form is visible
   */
  async isTaskFormVisible(): Promise<boolean> {
    return await this.aiObserve('task creation form is visible')
  }

  /**
   * Fill and submit a new task
   */
  async createTask(taskDescription: string): Promise<void> {
    await this.aiFill('task description input field', taskDescription)
    await this.aiClick('submit task button')
  }

  /**
   * Get all visible tasks
   */
  async getVisibleTasks(): Promise<string[]> {
    const tasksText = await this.aiExtract('all task items text')
    return tasksText.split('\n').filter((task) => task.trim().length > 0)
  }

  /**
   * Click on a specific task
   */
  async clickTask(taskDescription: string): Promise<void> {
    await this.aiClick(`task item containing "${taskDescription}"`)
  }
}
