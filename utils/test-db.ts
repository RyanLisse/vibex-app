/**
 * Test Database Branch Management for Neon
 *
 * This module provides utilities for creating and managing isolated test database
 * branches using Neon's branching feature. This approach ensures complete test
 * isolation without the need for mocking.
 */

import { randomBytes } from 'crypto'

interface NeonBranch {
  id: string
  name: string
  connectionUri: string
  createdAt: Date
}

interface NeonApiConfig {
  projectId: string
  apiKey: string
  apiUrl?: string
}

export class NeonTestDatabase {
  private config: NeonApiConfig
  private activeBranches: Map<string, NeonBranch> = new Map()

  constructor() {
    // Get configuration from environment
    const projectId = process.env.NEON_PROJECT_ID || 'dark-lab-64080564'
    const apiKey = process.env.NEON_API_KEY

    if (!apiKey) {
      throw new Error('NEON_API_KEY environment variable is required for test database branching')
    }

    this.config = {
      projectId,
      apiKey,
      apiUrl: process.env.NEON_API_URL || 'https://console.neon.tech/api/v2',
    }
  }

  /**
   * Create a new test database branch
   */
  async createTestBranch(testName?: string): Promise<string> {
    const branchName = this.generateBranchName(testName)

    try {
      // Create branch via Neon API
      const response = await fetch(
        `${this.config.apiUrl}/projects/${this.config.projectId}/branches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            branch: {
              name: branchName,
              // Create from main branch
              parent_id: await this.getMainBranchId(),
            },
          }),
        }
      )

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to create test branch: ${error}`)
      }

      const data = await response.json()
      const branch = data.branch

      // Get connection string for the branch
      const connectionUri = await this.getBranchConnectionString(branch.id)

      const testBranch: NeonBranch = {
        id: branch.id,
        name: branchName,
        connectionUri,
        createdAt: new Date(),
      }

      this.activeBranches.set(branch.id, testBranch)

      console.log(`Created test branch: ${branchName} (${branch.id})`)
      return branch.id
    } catch (error) {
      console.error('Failed to create test branch:', error)
      throw error
    }
  }

  /**
   * Delete a test branch
   */
  async deleteTestBranch(branchId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/projects/${this.config.projectId}/branches/${branchId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        }
      )

      if (!response.ok && response.status !== 404) {
        const error = await response.text()
        throw new Error(`Failed to delete test branch: ${error}`)
      }

      this.activeBranches.delete(branchId)
      console.log(`Deleted test branch: ${branchId}`)
    } catch (error) {
      console.error('Failed to delete test branch:', error)
      // Don't throw - cleanup should be best effort
    }
  }

  /**
   * Get the database URL for a test branch
   */
  async getTestDatabaseUrl(branchId: string): Promise<string> {
    const branch = this.activeBranches.get(branchId)
    if (branch) {
      return branch.connectionUri
    }

    // If not cached, fetch from API
    return await this.getBranchConnectionString(branchId)
  }

  /**
   * Cleanup all active test branches
   */
  async cleanupAllBranches(): Promise<void> {
    const cleanupPromises = Array.from(this.activeBranches.keys()).map((branchId) =>
      this.deleteTestBranch(branchId)
    )

    await Promise.allSettled(cleanupPromises)
    this.activeBranches.clear()
  }

  /**
   * List all test branches (for debugging/cleanup)
   */
  async listTestBranches(): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/projects/${this.config.projectId}/branches`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to list branches')
      }

      const data = await response.json()
      return data.branches
        .filter((b: any) => b.name.startsWith('test-'))
        .map((b: any) => ({
          id: b.id,
          name: b.name,
          createdAt: b.created_at,
        }))
    } catch (error) {
      console.error('Failed to list test branches:', error)
      return []
    }
  }

  /**
   * Cleanup old test branches (older than 1 hour)
   */
  async cleanupOldTestBranches(): Promise<void> {
    const branches = await this.listTestBranches()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const cleanupPromises = branches
      .filter((b: any) => new Date(b.createdAt) < oneHourAgo)
      .map((b: any) => this.deleteTestBranch(b.id))

    await Promise.allSettled(cleanupPromises)
  }

  /**
   * Get the main branch ID
   */
  private async getMainBranchId(): Promise<string> {
    const response = await fetch(
      `${this.config.apiUrl}/projects/${this.config.projectId}/branches`,
      {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to get main branch')
    }

    const data = await response.json()
    const mainBranch = data.branches.find((b: any) => b.name === 'main' || b.primary)

    if (!mainBranch) {
      throw new Error('Main branch not found')
    }

    return mainBranch.id
  }

  /**
   * Get connection string for a branch
   */
  private async getBranchConnectionString(branchId: string): Promise<string> {
    const response = await fetch(
      `${this.config.apiUrl}/projects/${this.config.projectId}/branches/${branchId}`,
      {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to get branch details')
    }

    const data = await response.json()
    const endpoint = data.endpoints?.[0]

    if (!endpoint) {
      throw new Error('No endpoint found for branch')
    }

    // Construct connection string
    const host = endpoint.host
    const password = await this.getEndpointPassword(endpoint.id)

    return `postgresql://neondb_owner:${password}@${host}/neondb?sslmode=require`
  }

  /**
   * Get endpoint password
   */
  private async getEndpointPassword(endpointId: string): Promise<string> {
    const response = await fetch(
      `${this.config.apiUrl}/projects/${this.config.projectId}/endpoints/${endpointId}/password`,
      {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to get endpoint password')
    }

    const data = await response.json()
    return data.password
  }

  /**
   * Generate a unique branch name
   */
  private generateBranchName(testName?: string): string {
    const timestamp = Date.now()
    const random = randomBytes(4).toString('hex')
    const sanitizedTestName = testName
      ? testName
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .substring(0, 30)
      : 'test'

    return `test-${sanitizedTestName}-${timestamp}-${random}`
  }
}

// Export singleton instance for easy use
export const testDb = new NeonTestDatabase()

// Helper functions for easy use
export async function createTestBranch(testName?: string): Promise<string> {
  return testDb.createTestBranch(testName)
}

export async function deleteTestBranch(branchId: string): Promise<void> {
  return testDb.deleteTestBranch(branchId)
}

export async function getTestDatabaseUrl(branchId: string): Promise<string> {
  return testDb.getTestDatabaseUrl(branchId)
}

export async function cleanupAllTestBranches(): Promise<void> {
  return testDb.cleanupAllBranches()
}

export async function cleanupOldTestBranches(): Promise<void> {
  return testDb.cleanupOldTestBranches()
}
