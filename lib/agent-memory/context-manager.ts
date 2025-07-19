/**
 * Agent Memory Context Manager
 *
 * Manages memory contexts for agent sessions, providing relevant memories
 * and suggestions based on current context.
 */

import { memoryRepository } from './repository'
import { memorySearchService } from './search-service'
import { observability } from '@/lib/observability'
import type { MemoryContext, MemoryEntry, MemorySuggestion, MemoryType } from './types'

export class MemoryContextManager {
  private static instance: MemoryContextManager
  private contextCache: Map<string, MemoryContext> = new Map()
  private readonly CACHE_TTL = 10 * 60 * 1000 // 10 minutes

  private constructor() {}

  static getInstance(): MemoryContextManager {
    if (!MemoryContextManager.instance) {
      MemoryContextManager.instance = new MemoryContextManager()
    }
    return MemoryContextManager.instance
  }

  /**
   * Get or create memory context for an agent session
   */
  async getContext(
    agentType: string,
    contextKey: string,
    options: {
      sessionId?: string
      currentTask?: string
      userContext?: Record<string, any>
      environmentContext?: Record<string, any>
    } = {}
  ): Promise<MemoryContext> {
    const startTime = Date.now()

    try {
      // Check cache
      const cacheKey = `${agentType}:${contextKey}:${options.sessionId || 'default'}`
      const cached = this.getCachedContext(cacheKey)
      if (cached) {
        observability.metrics.recordOperation('memory_context_cache_hit', 0)
        return cached
      }

      // Build context
      const context = await this.buildContext(agentType, contextKey, options)

      // Cache context
      this.setCachedContext(cacheKey, context)

      const duration = Date.now() - startTime
      observability.metrics.recordOperation('memory_context_build', duration)

      await observability.recordEvent('memory_context_created', {
        agentType,
        contextKey,
        sessionId: options.sessionId,
        memoriesCount: context.recentMemories.length + context.relevantMemories.length,
        duration,
      })

      return context
    } catch (error) {
      observability.recordError('memory_context_build', error as Error)
      throw error
    }
  }

  /**
   * Update context with new information
   */
  async updateContext(
    context: MemoryContext,
    updates: {
      currentTask?: string
      userContext?: Record<string, any>
      environmentContext?: Record<string, any>
    }
  ): Promise<MemoryContext> {
    // Update basic fields
    if (updates.currentTask !== undefined) {
      context.currentTask = updates.currentTask
    }
    if (updates.userContext) {
      context.userContext = { ...context.userContext, ...updates.userContext }
    }
    if (updates.environmentContext) {
      context.environmentContext = { ...context.environmentContext, ...updates.environmentContext }
    }

    // Refresh relevant memories if task changed
    if (updates.currentTask && updates.currentTask !== context.currentTask) {
      context.relevantMemories = await this.findRelevantMemories(
        context.agentType,
        updates.currentTask,
        context.contextKey
      )
      context.suggestions = await this.generateSuggestions(context)
    }

    // Update cache
    const cacheKey = `${context.agentType}:${context.contextKey}:${context.sessionId || 'default'}`
    this.setCachedContext(cacheKey, context)

    return context
  }

  /**
   * Build memory context
   */
  private async buildContext(
    agentType: string,
    contextKey: string,
    options: {
      sessionId?: string
      currentTask?: string
      userContext?: Record<string, any>
      environmentContext?: Record<string, any>
    }
  ): Promise<MemoryContext> {
    // Get recent memories
    const recentMemories = await memoryRepository.getRecent(agentType, 10, contextKey)

    // Get relevant memories based on current task
    const relevantMemories = options.currentTask
      ? await this.findRelevantMemories(agentType, options.currentTask, contextKey)
      : []

    // Get shared memories from other agents
    const sharedMemories = await this.findSharedMemories(agentType, contextKey)

    // Generate context summary
    const summary = await this.generateContextSummary(
      recentMemories,
      relevantMemories,
      sharedMemories
    )

    const context: MemoryContext = {
      agentType,
      contextKey,
      sessionId: options.sessionId,
      currentTask: options.currentTask,
      userContext: options.userContext || {},
      environmentContext: options.environmentContext || {},
      recentMemories,
      relevantMemories,
      sharedMemories,
      summary,
      suggestions: [],
    }

    // Generate suggestions
    context.suggestions = await this.generateSuggestions(context)

    return context
  }

  /**
   * Find relevant memories for current task
   */
  private async findRelevantMemories(
    agentType: string,
    currentTask: string,
    contextKey?: string
  ): Promise<MemoryEntry[]> {
    const searchResults = await memorySearchService.search(currentTask, {
      agentType,
      contextKey,
      limit: 15,
      orderBy: 'relevance',
    })

    return searchResults.map((result) => result.memory)
  }

  /**
   * Find shared memories from other agents
   */
  private async findSharedMemories(agentType: string, contextKey: string): Promise<MemoryEntry[]> {
    // Look for memories tagged as shareable from other agent types
    const sharedMemories = await memoryRepository.search({
      tags: ['shared', 'cross-agent'],
      limit: 10,
      orderBy: 'importance',
    })

    // Filter out memories from the same agent type
    return sharedMemories.filter((memory) => memory.agentType !== agentType)
  }

  /**
   * Generate context summary
   */
  private async generateContextSummary(
    recentMemories: MemoryEntry[],
    relevantMemories: MemoryEntry[],
    sharedMemories: MemoryEntry[]
  ): Promise<string> {
    const allMemories = [...recentMemories, ...relevantMemories, ...sharedMemories]

    if (allMemories.length === 0) {
      return 'No relevant context available.'
    }

    // Group memories by type
    const memoryGroups = new Map<MemoryType, MemoryEntry[]>()

    for (const memory of allMemories) {
      const type = memory.metadata.type
      if (!memoryGroups.has(type)) {
        memoryGroups.set(type, [])
      }
      memoryGroups.get(type)!.push(memory)
    }

    // Build summary
    const summaryParts: string[] = []

    // Add high-importance memories
    const criticalMemories = allMemories.filter((m) => m.importance >= 8).slice(0, 3)

    if (criticalMemories.length > 0) {
      summaryParts.push(
        'Critical context: ' + criticalMemories.map((m) => m.content.substring(0, 100)).join('; ')
      )
    }

    // Add type-based summaries
    for (const [type, memories] of memoryGroups.entries()) {
      if (memories.length > 0) {
        const typeMemories = memories.slice(0, 2)
        summaryParts.push(
          `${type}: ${typeMemories.map((m) => m.content.substring(0, 50)).join(', ')}`
        )
      }
    }

    return summaryParts.join('. ')
  }

  /**
   * Generate memory suggestions
   */
  private async generateSuggestions(context: MemoryContext): Promise<MemorySuggestion[]> {
    const suggestions: MemorySuggestion[] = []

    // Suggest memories based on current task
    if (context.currentTask) {
      const taskRelatedMemories = await memorySearchService.search(context.currentTask, {
        agentType: context.agentType,
        limit: 5,
        types: ['task_execution', 'learned_pattern', 'error_resolution'],
      })

      for (const result of taskRelatedMemories) {
        if (result.score.total > 0.7) {
          suggestions.push({
            memory: result.memory,
            reason: 'Related to current task',
            relevanceScore: result.score.total,
            confidence: result.score.semantic,
          })
        }
      }
    }

    // Suggest frequently accessed memories
    const frequentMemories = await memoryRepository.getMostAccessed(context.agentType, 5)

    for (const memory of frequentMemories) {
      if (!suggestions.find((s) => s.memory.id === memory.id)) {
        suggestions.push({
          memory,
          reason: 'Frequently accessed',
          relevanceScore: 0.6,
          confidence: 0.8,
        })
      }
    }

    // Suggest error resolution memories if recent errors
    if (context.environmentContext.hasRecentErrors) {
      const errorMemories = await memorySearchService.searchByType(['error_resolution'], {
        agentType: context.agentType,
        limit: 3,
      })

      for (const result of errorMemories) {
        if (!suggestions.find((s) => s.memory.id === result.memory.id)) {
          suggestions.push({
            memory: result.memory,
            reason: 'Error resolution pattern',
            relevanceScore: 0.8,
            confidence: 0.9,
          })
        }
      }
    }

    // Sort by relevance score
    suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore)

    return suggestions.slice(0, 10)
  }

  /**
   * Get cached context
   */
  private getCachedContext(key: string): MemoryContext | null {
    const cached = this.contextCache.get(key)
    if (!cached) return null

    // Check if cache is still valid
    const cacheData = cached as any
    if (cacheData._timestamp && Date.now() - cacheData._timestamp > this.CACHE_TTL) {
      this.contextCache.delete(key)
      return null
    }

    return cached
  }

  /**
   * Set cached context
   */
  private setCachedContext(key: string, context: MemoryContext): void {
    // Add timestamp
    const cachedData = context as any
    cachedData._timestamp = Date.now()

    // Limit cache size
    if (this.contextCache.size >= 100) {
      const firstKey = this.contextCache.keys().next().value
      this.contextCache.delete(firstKey)
    }

    this.contextCache.set(key, cachedData)
  }

  /**
   * Clear context cache
   */
  clearCache(): void {
    this.contextCache.clear()
  }

  /**
   * Preload context for an agent
   */
  async preloadContext(agentType: string, contextKeys: string[]): Promise<void> {
    const preloadPromises = contextKeys.map((contextKey) => this.getContext(agentType, contextKey))

    await Promise.all(preloadPromises)
    console.log(`Preloaded ${contextKeys.length} contexts for ${agentType}`)
  }
}

// Export singleton instance
export const memoryContextManager = MemoryContextManager.getInstance()
