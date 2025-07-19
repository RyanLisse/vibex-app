/**
 * Agent Memory Sharing Service
 *
 * Enables knowledge sharing between different agent types through
 * memory cross-pollination and transformation.
 */

import { memoryRepository } from './repository'
import { memorySearchService } from './search-service'
import { observability } from '@/lib/observability'
import type {
  MemoryEntry,
  MemorySharingConfig,
  MemoryTransformRule,
  MemoryType,
  CreateMemoryInput,
} from './types'

export class MemorySharingService {
  private static instance: MemorySharingService
  private sharingConfigs: Map<string, MemorySharingConfig[]> = new Map()
  private sharingStats: Map<string, number> = new Map()

  private constructor() {
    // Initialize default sharing configurations
    this.initializeDefaultConfigs()
  }

  static getInstance(): MemorySharingService {
    if (!MemorySharingService.instance) {
      MemorySharingService.instance = new MemorySharingService()
    }
    return MemorySharingService.instance
  }

  /**
   * Register a sharing configuration
   */
  registerSharingConfig(config: MemorySharingConfig): void {
    const configs = this.sharingConfigs.get(config.sourceAgentType) || []
    configs.push(config)
    this.sharingConfigs.set(config.sourceAgentType, configs)

    console.log(
      `Registered sharing config: ${config.sourceAgentType} -> ${config.targetAgentTypes.join(', ')}`
    )
  }

  /**
   * Share memory across agents based on configurations
   */
  async shareMemory(memory: MemoryEntry): Promise<string[]> {
    const startTime = Date.now()
    const sharedToAgents: string[] = []

    try {
      // Get sharing configurations for this agent type
      const configs = this.sharingConfigs.get(memory.agentType) || []

      for (const config of configs) {
        // Check if memory should be shared
        if (!this.shouldShareMemory(memory, config)) {
          continue
        }

        // Share to each target agent type
        for (const targetAgentType of config.targetAgentTypes) {
          try {
            await this.shareToAgent(memory, targetAgentType, config)
            sharedToAgents.push(targetAgentType)
          } catch (error) {
            console.error(`Failed to share memory to ${targetAgentType}:`, error)
          }
        }
      }

      // Update sharing statistics
      this.updateSharingStats(memory.agentType, sharedToAgents.length)

      const duration = Date.now() - startTime
      observability.metrics.recordOperation('memory_share', duration)

      if (sharedToAgents.length > 0) {
        await observability.recordEvent('memory_shared', {
          sourceAgent: memory.agentType,
          targetAgents: sharedToAgents,
          memoryType: memory.metadata.type,
          importance: memory.importance,
          duration,
        })
      }

      return sharedToAgents
    } catch (error) {
      observability.recordError('memory_share', error as Error)
      throw error
    }
  }

  /**
   * Share multiple memories in batch
   */
  async shareMemories(
    memories: MemoryEntry[],
    targetAgentTypes?: string[]
  ): Promise<Map<string, string[]>> {
    const results = new Map<string, string[]>()

    for (const memory of memories) {
      const sharedTo = targetAgentTypes
        ? await this.shareToSpecificAgents(memory, targetAgentTypes)
        : await this.shareMemory(memory)

      results.set(memory.id, sharedTo)
    }

    return results
  }

  /**
   * Find and share relevant memories between agents
   */
  async crossPollinate(
    sourceAgentType: string,
    targetAgentType: string,
    options: {
      query?: string
      types?: MemoryType[]
      minImportance?: number
      limit?: number
    } = {}
  ): Promise<number> {
    try {
      // Find relevant memories from source agent
      const searchResults = await memorySearchService.search(options.query || '', {
        agentType: sourceAgentType,
        types: options.types,
        importance: { min: options.minImportance || 5 },
        limit: options.limit || 20,
      })

      let sharedCount = 0

      // Share each relevant memory
      for (const result of searchResults) {
        if (result.score.total > 0.7) {
          const config: MemorySharingConfig = {
            sourceAgentType,
            targetAgentTypes: [targetAgentType],
            memoryTypes: options.types || ['knowledge_base', 'learned_pattern'],
            minImportance: options.minImportance || 5,
          }

          try {
            await this.shareToAgent(result.memory, targetAgentType, config)
            sharedCount++
          } catch (error) {
            console.error('Failed to cross-pollinate memory:', error)
          }
        }
      }

      await observability.recordEvent('memory_cross_pollination', {
        sourceAgent: sourceAgentType,
        targetAgent: targetAgentType,
        sharedCount,
        query: options.query,
      })

      return sharedCount
    } catch (error) {
      observability.recordError('memory_cross_pollination', error as Error)
      throw error
    }
  }

  /**
   * Get sharing statistics
   */
  getSharingStats(): {
    totalShared: number
    sharingByAgent: Map<string, number>
    activeConfigs: number
  } {
    let totalShared = 0
    for (const count of this.sharingStats.values()) {
      totalShared += count
    }

    return {
      totalShared,
      sharingByAgent: new Map(this.sharingStats),
      activeConfigs: Array.from(this.sharingConfigs.values()).flat().length,
    }
  }

  /**
   * Check if memory should be shared based on configuration
   */
  private shouldShareMemory(memory: MemoryEntry, config: MemorySharingConfig): boolean {
    // Check memory type
    if (!config.memoryTypes.includes(memory.metadata.type)) {
      return false
    }

    // Check importance
    if (memory.importance < config.minImportance) {
      return false
    }

    // Check if already shared (avoid duplicates)
    if (memory.metadata.tags?.includes('shared')) {
      return false
    }

    return true
  }

  /**
   * Share memory to specific agent type
   */
  private async shareToAgent(
    memory: MemoryEntry,
    targetAgentType: string,
    config: MemorySharingConfig
  ): Promise<void> {
    // Transform memory content if rules are defined
    let transformedContent = memory.content
    const transformedMetadata = { ...memory.metadata }

    if (config.transformRules) {
      transformedContent = this.applyTransformRules(transformedContent, config.transformRules)
    }

    // Update metadata for shared memory
    transformedMetadata.source = memory.agentType
    transformedMetadata.tags = [
      ...(transformedMetadata.tags || []),
      'shared',
      'cross-agent',
      `from-${memory.agentType}`,
    ]
    transformedMetadata.relatedMemories = [
      ...(transformedMetadata.relatedMemories || []),
      memory.id,
    ]

    // Create shared memory entry
    const sharedMemory: CreateMemoryInput = {
      agentType: targetAgentType,
      contextKey: `shared_${memory.contextKey}`,
      content: transformedContent,
      embedding: memory.embedding, // Reuse embedding for efficiency
      metadata: transformedMetadata,
      importance: Math.max(1, memory.importance - 1) as any, // Slightly reduce importance
    }

    await memoryRepository.create(sharedMemory)
  }

  /**
   * Share to specific agents
   */
  private async shareToSpecificAgents(
    memory: MemoryEntry,
    targetAgentTypes: string[]
  ): Promise<string[]> {
    const sharedTo: string[] = []

    const config: MemorySharingConfig = {
      sourceAgentType: memory.agentType,
      targetAgentTypes,
      memoryTypes: [memory.metadata.type],
      minImportance: 1,
    }

    for (const targetAgent of targetAgentTypes) {
      try {
        await this.shareToAgent(memory, targetAgent, config)
        sharedTo.push(targetAgent)
      } catch (error) {
        console.error(`Failed to share to ${targetAgent}:`, error)
      }
    }

    return sharedTo
  }

  /**
   * Apply transform rules to content
   */
  private applyTransformRules(content: string, rules: MemoryTransformRule[]): string {
    let transformed = content

    for (const rule of rules) {
      if (typeof rule.from === 'string') {
        transformed = transformed.replace(rule.from, rule.to)
      } else {
        transformed = transformed.replace(rule.from, rule.to)
      }
    }

    return transformed
  }

  /**
   * Update sharing statistics
   */
  private updateSharingStats(agentType: string, count: number): void {
    const current = this.sharingStats.get(agentType) || 0
    this.sharingStats.set(agentType, current + count)
  }

  /**
   * Initialize default sharing configurations
   */
  private initializeDefaultConfigs(): void {
    // Share error resolutions between all agents
    this.registerSharingConfig({
      sourceAgentType: '*',
      targetAgentTypes: ['*'],
      memoryTypes: ['error_resolution'],
      minImportance: 7,
    })

    // Share learned patterns between similar agents
    this.registerSharingConfig({
      sourceAgentType: 'task_executor',
      targetAgentTypes: ['workflow_orchestrator', 'automation_agent'],
      memoryTypes: ['learned_pattern', 'skill_acquisition'],
      minImportance: 6,
    })

    // Share user preferences across all agents
    this.registerSharingConfig({
      sourceAgentType: '*',
      targetAgentTypes: ['*'],
      memoryTypes: ['user_preference'],
      minImportance: 5,
    })
  }

  /**
   * Find memories shared from a specific agent
   */
  async getSharedFromAgent(
    sourceAgentType: string,
    targetAgentType: string,
    limit = 20
  ): Promise<MemoryEntry[]> {
    return memoryRepository.search({
      agentType: targetAgentType,
      tags: [`from-${sourceAgentType}`, 'shared'],
      limit,
      orderBy: 'recency',
    })
  }

  /**
   * Get memory sharing recommendations
   */
  async getShareRecommendations(
    agentType: string,
    limit = 10
  ): Promise<
    Array<{
      memory: MemoryEntry
      targetAgents: string[]
      reason: string
    }>
  > {
    const recommendations: Array<{
      memory: MemoryEntry
      targetAgents: string[]
      reason: string
    }> = []

    // Get high-importance memories that haven't been shared
    const unsharedMemories = await memoryRepository.search({
      agentType,
      importance: { min: 7 },
      limit,
    })

    for (const memory of unsharedMemories) {
      if (!memory.metadata.tags?.includes('shared')) {
        const configs = this.sharingConfigs.get(agentType) || []
        const applicableConfigs = configs.filter((config) => this.shouldShareMemory(memory, config))

        if (applicableConfigs.length > 0) {
          const targetAgents = Array.from(
            new Set(applicableConfigs.flatMap((c) => c.targetAgentTypes))
          )

          recommendations.push({
            memory,
            targetAgents,
            reason: `High importance ${memory.metadata.type} memory`,
          })
        }
      }
    }

    return recommendations
  }
}

// Export singleton instance
export const memorySharingService = MemorySharingService.getInstance()
