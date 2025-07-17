import { Page } from '@playwright/test'
import { Stagehand } from 'stagehand'
import { BasePage } from './base.page'

/**
 * Task detail page object model
 */
export class TaskPage extends BasePage {
  constructor(page: Page, stagehand: Stagehand) {
    super(page, stagehand)
  }

  /**
   * Navigate to a specific task page
   */
  async goto(taskId: string) {
    await super.goto(`/task/${taskId}`)
  }

  /**
   * Get the task title
   */
  async getTaskTitle(): Promise<string> {
    return await this.aiExtract('task title text')
  }

  /**
   * Check if the message input is visible
   */
  async isMessageInputVisible(): Promise<boolean> {
    return await this.aiObserve('message input field is visible')
  }

  /**
   * Send a message in the task
   */
  async sendMessage(message: string): Promise<void> {
    await this.aiFill('message input field', message)
    await this.aiClick('send message button')
  }

  /**
   * Get all visible messages
   */
  async getMessages(): Promise<string[]> {
    const messagesText = await this.aiExtract('all message content text')
    return messagesText.split('\n').filter((msg) => msg.trim().length > 0)
  }

  /**
   * Wait for a new message to appear
   */
  async waitForNewMessage(): Promise<void> {
    await this.waitForElement('new message appears')
  }

  /**
   * Check if streaming indicator is visible
   */
  async isStreamingIndicatorVisible(): Promise<boolean> {
    return await this.aiObserve('streaming indicator is visible')
  }

  /**
   * Wait for streaming to complete
   */
  async waitForStreamingComplete(): Promise<void> {
    // Wait for streaming indicator to disappear
    const startTime = Date.now()
    const timeout = 30000 // 30 seconds

    while (Date.now() - startTime < timeout) {
      const isStreaming = await this.isStreamingIndicatorVisible()
      if (!isStreaming) {
        return
      }
      await this.page.waitForTimeout(1000)
    }

    throw new Error('Streaming did not complete within timeout')
  }

  /**
   * Get the last message content
   */
  async getLastMessage(): Promise<string> {
    return await this.aiExtract('the last message content')
  }

  /**
   * Check if code block is present in messages
   */
  async hasCodeBlock(): Promise<boolean> {
    return await this.aiObserve('code block is present in messages')
  }

  /**
   * Copy code from a code block
   */
  async copyCodeBlock(): Promise<void> {
    await this.aiClick('copy code button')
  }

  /**
   * Navigate back to home
   */
  async goBack(): Promise<void> {
    await this.aiClick('back button or home link')
  }
}
