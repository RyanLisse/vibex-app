/**
 * Agent Memory System
 *
 * Main entry point for the agent memory system, providing a unified interface
 * for memory storage, retrieval, search, context management, and knowledge sharing.
 */

import { observability } from '@/lib/observability'
import { memoryRepository } from './repository'
import { memorySearchService } from './search-service'
import { memoryContextManager } from './context-manager'
import { memorySharingService } from './sharing-service'
import { memoryLifecycleManager } from './lifecycle-manager'
import { memorySuggestionEngine } from './suggestion-engine'
import type {
  CreateMemoryInput,
  MemoryContext,
  MemoryEntry,
  MemorySearchOptions,
  MemorySearchResult,
  MemorySharingConfig,
  MemorySuggestion,
  MemorySystemConfig,
  UpdateMemoryInput,
} from './types'

/**
 * Agent Memory System
 *
 * Unified interface for all memory operations
 */
export class AgentMemorySystem {
  private static instance: AgentMemorySystem
  private config: MemorySystemConfig
  private isInitialized = false

  private constructor(config: Partial<MemorySystemConfig> = {}) {
    this.config = {
      vectorDimensions: 1536,
      semanticSearchThreshold: 0.7,
      maxMemoriesPerAgent: 10000,
      memoryExpirationDays: 90,
      archiveAfterDays: 30,
      enableAutoSummarization: true,
      enableCrossPollination: true,
      cacheConfig: {
        enabled: true,
        ttl: 5 * 60 * 1000,
        maxSize: 1000,
      },
      ...config,
    }
  }

  static getInstance(config?: Partial<MemorySystemConfig>): AgentMemorySystem {
    if (!AgentMemorySystem.instance) {
      AgentMemorySystem.instance = new AgentMemorySystem(config)
    }
    return AgentMemorySystem.instance
  }

  /**
   * Initialize the memory system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Start lifecycle maintenance
      memoryLifecycleManager.startMaintenance()

      // Warm up search indices for common agent types
      const warmupPromises = [
        memorySearchService.warmUp('orchestrator'),
        memorySearchService.warmUp('task_executor'),
        memorySearchService.warmUp('workflow_orchestrator'),
      ]

      await Promise.all(warmupPromises)

      this.isInitialized = true
      console.log('Agent memory system initialized')
    } catch (error) {
      console.error('Failed to initialize memory system:', error)
      throw error
    }
  }

  /**
   * Store a new memory
   */
  async storeMemory(input: CreateMemoryInput): Promise<MemoryEntry> {
    const startTime = Date.now()

    try {
      // Create memory
      const memory = await memoryRepository.create(input)

      // Share memory if enabled
      if (this.config.enableCrossPollination) {
        await memorySharingService.shareMemory(memory)
      }

      const duration = Date.now() - startTime
      observability.metrics.recordOperation('memory_store', duration)

      await observability.recordEvent('memory_stored', {
        memoryId: memory.id,
        agentType: memory.agentType,
        type: memory.metadata.type,
        duration,
      })

      return memory
    } catch (error) {
      observability.recordError('memory_store', error as Error)
      throw error
    }
  }

  /**
   * Update an existing memory
   */
  async updateMemory(memoryId: string, updates: UpdateMemoryInput): Promise<MemoryEntry | null> {
    try {
      const memory = await memoryRepository.update(memoryId, updates)

      if (memory) {
        // Clear caches
        memorySearchService.clearCache()
        memoryContextManager.clearCache()
      }

      return memory
    } catch (error) {
      observability.recordError('memory_update', error as Error)
      throw error
    }
  }

  /**
   * Search memories
   */
  async searchMemories(
    query: string,
    options: MemorySearchOptions = {}
  ): Promise<MemorySearchResult[]> {
    return memorySearchService.search(query, options)
  }

  /**
   * Find similar memories
   */
  async findSimilarMemories(
    memoryId: string,
    options: MemorySearchOptions = {}
  ): Promise<MemorySearchResult[]> {
    return memorySearchService.findSimilar(memoryId, options)
  }

  /**
   * Get memory context for agent session
   */
  async getMemoryContext(
    agentType: string,
    contextKey: string,
    options: {
      sessionId?: string
      currentTask?: string
      userContext?: Record<string, any>
      environmentContext?: Record<string, any>
    } = {}
  ): Promise<MemoryContext> {
    return memoryContextManager.getContext(agentType, contextKey, options)
  }

  /**
   * Update memory context
   */
  async updateMemoryContext(
    context: MemoryContext,
    updates: {
      currentTask?: string
      userContext?: Record<string, any>
      environmentContext?: Record<string, any>
    }
  ): Promise<MemoryContext> {
    return memoryContextManager.updateContext(context, updates)
  }

  /**
   * Get memory suggestions
   */
  async getMemorySuggestions(
    context: MemoryContext,
    options: {
      maxSuggestions?: number
      minConfidence?: number
      strategies?: string[]
    } = {}
  ): Promise<MemorySuggestion[]> {
    return memorySuggestionEngine.getSuggestions(context, options)
  }

  /**
   * Share memory with other agents
   */
  async shareMemory(memory: MemoryEntry, targetAgentTypes?: string[]): Promise<string[]> {
    if (targetAgentTypes) {
      const results = await memorySharingService.shareMemories([memory], targetAgentTypes)
      return results.get(memory.id) || []
    }
    return memorySharingService.shareMemory(memory)
  }

  /**
   * Cross-pollinate memories between agents
   */
  async crossPollinate(
    sourceAgentType: string,
    targetAgentType: string,
    options: {
      query?: string
      types?: string[]
      minImportance?: number
      limit?: number
    } = {}
  ): Promise<number> {
    return memorySharingService.crossPollinate(sourceAgentType, targetAgentType, options as any)
  }

  /**
   * Register sharing configuration
   */
  registerSharingConfig(config: MemorySharingConfig): void {
    memorySharingService.registerSharingConfig(config)
  }

  /**
   * Memory lifecycle operations
   */
  async setMemoryExpiration(memoryId: string, expiresAt: Date | null): Promise<void> {
    return memoryLifecycleManager.setExpiration(memoryId, expiresAt)
  }

  async extendMemoryLifetime(memoryId: string, additionalDays: number): Promise<void> {
    return memoryLifecycleManager.extendLifetime(memoryId, additionalDays)
  }

  async promoteMemory(memoryId: string, newImportance?: number): Promise<void> {
    return memoryLifecycleManager.promoteMemory(memoryId, newImportance as any)
  }

  async runMaintenance(): Promise<{
    expired: number
    archived: number
    optimized: number
  }> {
    return memoryLifecycleManager.runMaintenance()
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(agentType?: string): Promise<{
    totalCount: number
    averageImportance: number
    averageAccessCount: number
    storageSize: number
    sharingStats: {
      totalShared: number
      sharingByAgent: Map<string, number>
      activeConfigs: number
    }
  }> {
    const baseStats = await memoryRepository.getStats(agentType)
    const sharingStats = memorySharingService.getSharingStats()

    return {
      ...baseStats,
      sharingStats,
    }
  }

  /**
   * Get memory health report
   */
  async getHealthReport(agentType?: string): Promise<{
    totalMemories: number
    expiringMemories: number
    archivedMemories: number
    averageAge: number
    storageUtilization: number
    recommendations: string[]
  }> {
    return memoryLifecycleManager.getHealthReport(agentType)
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    memorySearchService.clearCache()
    memoryContextManager.clearCache()
    memorySuggestionEngine.clearCache()
  }
}

// Export singleton instance
export const agentMemorySystem = AgentMemorySystem.getInstance()
