/**
 * Agent Memory and Context System
 *
 * Implements persistent agent memory with vector embeddings, semantic search,
 * knowledge sharing between sessions, and automatic context summarization.
 */

import { and, cosineDistance, desc, eq, sql } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '@/db/config'
import { agentMemory } from '@/db/schema'
import { observability } from '@/lib/observability'
import { wasmServices } from '@/lib/wasm/services'

// Memory types
export type MemoryType =
  | 'conversation'
  | 'task_execution'
  | 'user_preference'
  | 'learned_pattern'
  | 'error_resolution'
  | 'context_summary'
  | 'knowledge_base'
  | 'skill_acquisition'

// Memory importance levels
export type MemoryImportance = 'low' | 'medium' | 'high' | 'critical'

// Memory access patterns
export type MemoryAccessPattern = 'frequent' | 'recent' | 'contextual' | 'archived'

// Memory entry interface
export interface MemoryEntry {
  id: string
  agentId: string
  sessionId?: string
  type: MemoryType
  content: string
  embedding?: number[]
  metadata: {
    importance: MemoryImportance
    accessPattern: MemoryAccessPattern
    tags: string[]
    context: Record<string, any>
    relatedMemories: string[]
    confidence: number
    source: string
  }
  createdAt: Date
  updatedAt: Date
  lastAccessedAt: Date
  accessCount: number
  expiresAt?: Date
}

// Memory search options
export interface MemorySearchOptions {
  query: string
  agentId?: string
  sessionId?: string
  types?: MemoryType[]
  importance?: MemoryImportance[]
  tags?: string[]
  limit?: number
  threshold?: number
  useSemanticSearch?: boolean
  includeArchived?: boolean
}

// Memory context interface
export interface MemoryContext {
  agentId: string
  sessionId: string
  currentTask?: string
  userContext: Record<string, any>
  environmentContext: Record<string, any>
  recentMemories: MemoryEntry[]
  relevantMemories: MemoryEntry[]
  summary: string
}

// Agent memory system
export class AgentMemorySystem {
  private static instance: AgentMemorySystem
  private memoryCache: Map<string, MemoryEntry[]> = new Map()
  private contextCache: Map<string, MemoryContext> = new Map()
  private readonly CACHE_SIZE = 1000
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  private constructor() {}

  static getInstance(): AgentMemorySystem {
    if (!AgentMemorySystem.instance) {
      AgentMemorySystem.instance = new AgentMemorySystem()
    }
    return AgentMemorySystem.instance
  }

  /**
   * Store memory entry
   */
  async storeMemory(
    agentId: string,
    type: MemoryType,
    content: string,
    metadata: Partial<MemoryEntry['metadata']> = {},
    sessionId?: string
  ): Promise<MemoryEntry> {
    try {
      const startTime = Date.now()

      // Generate embedding for semantic search
      let embedding: number[] | undefined
      try {
        if (wasmServices.isVectorSearchAvailable()) {
          embedding = await wasmServices.generateEmbedding(content)
        }
      } catch (error) {
        console.warn('Failed to generate embedding:', error)
      }

      const memoryEntry: MemoryEntry = {
        id: ulid(),
        agentId,
        sessionId,
        type,
        content,
        embedding,
        metadata: {
          importance: 'medium',
          accessPattern: 'recent',
          tags: [],
          context: {},
          relatedMemories: [],
          confidence: 1.0,
          source: 'agent',
          ...metadata,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
      }

      // Store in database
      await db.insert(agentMemory).values({
        id: memoryEntry.id,
        agentId: memoryEntry.agentId,
        sessionId: memoryEntry.sessionId,
        type: memoryEntry.type,
        content: memoryEntry.content,
        embedding: memoryEntry.embedding,
        metadata: memoryEntry.metadata,
        createdAt: memoryEntry.createdAt,
        updatedAt: memoryEntry.updatedAt,
        lastAccessedAt: memoryEntry.lastAccessedAt,
        accessCount: memoryEntry.accessCount,
        expiresAt: memoryEntry.expiresAt,
      })

      // Update cache
      this.updateMemoryCache(agentId, memoryEntry)

      const duration = Date.now() - startTime

      // Record metrics and events
      observability.metrics.queryDuration(duration, 'insert_memory', true)

      await observability.events.collector.collectEvent(
        'memory_update',
        'debug',
        `Memory stored for agent ${agentId}`,
        {
          memoryId: memoryEntry.id,
          agentId,
          sessionId,
          type,
          contentLength: content.length,
          hasEmbedding: !!embedding,
          duration,
        },
        'agent-memory',
        ['memory', 'store', type]
      )

      return memoryEntry
    } catch (error) {
      // Record error
      await observability.events.collector.collectEvent(
        'memory_update',
        'error',
        `Failed to store memory for agent ${agentId}`,
        {
          agentId,
          sessionId,
          type,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'agent-memory',
        ['memory', 'store', 'error']
      )
      throw error
    }
  }

  /**
   * Search memories
   */
  async searchMemories(options: MemorySearchOptions): Promise<MemoryEntry[]> {
    try {
      const startTime = Date.now()
      const {
        query,
        agentId,
        sessionId,
        types,
        importance,
        tags,
        limit = 20,
        threshold = 0.7,
        useSemanticSearch = true,
        includeArchived = false,
      } = options

      let memories: MemoryEntry[] = []

      if (useSemanticSearch && wasmServices.isVectorSearchAvailable()) {
        // Semantic search using vector embeddings
        memories = await this.performSemanticSearch(query, options)
      } else {
        // Fallback to text search
        memories = await this.performTextSearch(query, options)
      }

      // Update access patterns
      await this.updateAccessPatterns(memories.map((m) => m.id))

      const duration = Date.now() - startTime

      // Record metrics
      observability.metrics.queryDuration(duration, 'search_memories', true)
      observability.metrics.wasmExecutionTime(duration, 'memory_search')

      await observability.events.collector.collectEvent(
        'memory_access',
        'debug',
        `Memory search completed for agent ${agentId}`,
        {
          agentId,
          sessionId,
          query: query.substring(0, 100),
          resultCount: memories.length,
          useSemanticSearch,
          duration,
        },
        'agent-memory',
        ['memory', 'search']
      )

      return memories
    } catch (error) {
      await observability.events.collector.collectEvent(
        'memory_access',
        'error',
        `Memory search failed for agent ${options.agentId}`,
        {
          agentId: options.agentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'agent-memory',
        ['memory', 'search', 'error']
      )
      throw error
    }
  }

  /**
   * Get memory context for agent session
   */
  async getMemoryContext(
    agentId: string,
    sessionId: string,
    currentTask?: string
  ): Promise<MemoryContext> {
    try {
      const cacheKey = `${agentId}:${sessionId}`

      // Check cache first
      const cached = this.contextCache.get(cacheKey)
      if (cached && Date.now() - cached.createdAt.getTime() < this.CACHE_TTL) {
        return cached
      }

      const startTime = Date.now()

      // Get recent memories
      const recentMemories = await this.getRecentMemories(agentId, sessionId, 10)

      // Get relevant memories based on current task
      let relevantMemories: MemoryEntry[] = []
      if (currentTask) {
        relevantMemories = await this.searchMemories({
          query: currentTask,
          agentId,
          sessionId,
          limit: 15,
          useSemanticSearch: true,
        })
      }

      // Generate context summary
      const summary = await this.generateContextSummary(
        agentId,
        sessionId,
        recentMemories,
        relevantMemories
      )

      const context: MemoryContext = {
        agentId,
        sessionId,
        currentTask,
        userContext: {},
        environmentContext: {},
        recentMemories,
        relevantMemories,
        summary,
      }

      // Cache the context
      this.contextCache.set(cacheKey, context)

      const duration = Date.now() - startTime

      // Record metrics
      observability.metrics.queryDuration(duration, 'get_memory_context', true)

      return context
    } catch (error) {
      console.error('Failed to get memory context:', error)
      throw error
    }
  }

  /**
   * Update memory importance based on usage patterns
   */
  async updateMemoryImportance(memoryId: string, importance: MemoryImportance): Promise<void> {
    try {
      await db
        .update(agentMemory)
        .set({
          metadata: sql`metadata || ${JSON.stringify({ importance })}`,
          updatedAt: new Date(),
        })
        .where(eq(agentMemory.id, memoryId))

      // Clear relevant caches
      this.clearCaches()
    } catch (error) {
      console.error('Failed to update memory importance:', error)
      throw error
    }
  }

  /**
   * Archive old memories
   */
  async archiveOldMemories(agentId: string, olderThanDays = 30): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      const result = await db
        .update(agentMemory)
        .set({
          metadata: sql`metadata || ${JSON.stringify({ accessPattern: 'archived' })}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(agentMemory.agentId, agentId),
            sql`${agentMemory.lastAccessedAt} < ${cutoffDate}`,
            sql`metadata->>'importance' != 'critical'`
          )
        )

      // Clear caches
      this.clearCaches()

      return result.rowCount || 0
    } catch (error) {
      console.error('Failed to archive old memories:', error)
      throw error
    }
  }

  /**
   * Perform semantic search using vector embeddings
   */
  private async performSemanticSearch(
    query: string,
    options: MemorySearchOptions
  ): Promise<MemoryEntry[]> {
    // Generate query embedding
    const queryEmbedding = await wasmServices.generateEmbedding(query)

    // Build query conditions
    const conditions = []
    if (options.agentId) {
      conditions.push(eq(agentMemory.agentId, options.agentId))
    }
    if (options.sessionId) {
      conditions.push(eq(agentMemory.sessionId, options.sessionId))
    }

    // Perform vector similarity search
    const results = await db
      .select()
      .from(agentMemory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(cosineDistance(agentMemory.embedding, queryEmbedding))
      .limit(options.limit || 20)

    return results
      .filter(
        (result) =>
          result.embedding &&
          this.calculateSimilarity(queryEmbedding, result.embedding) >= (options.threshold || 0.7)
      )
      .map(this.mapDbMemoryToMemoryEntry)
  }

  /**
   * Perform text search fallback
   */
  private async performTextSearch(
    query: string,
    options: MemorySearchOptions
  ): Promise<MemoryEntry[]> {
    const conditions = []

    // Add text search condition
    conditions.push(sql`${agentMemory.content} ILIKE ${`%${query}%`}`)

    if (options.agentId) {
      conditions.push(eq(agentMemory.agentId, options.agentId))
    }
    if (options.sessionId) {
      conditions.push(eq(agentMemory.sessionId, options.sessionId))
    }

    const results = await db
      .select()
      .from(agentMemory)
      .where(and(...conditions))
      .orderBy(desc(agentMemory.lastAccessedAt))
      .limit(options.limit || 20)

    return results.map(this.mapDbMemoryToMemoryEntry)
  }

  /**
   * Get recent memories for agent/session
   */
  private async getRecentMemories(
    agentId: string,
    sessionId: string,
    limit = 10
  ): Promise<MemoryEntry[]> {
    const results = await db
      .select()
      .from(agentMemory)
      .where(and(eq(agentMemory.agentId, agentId), eq(agentMemory.sessionId, sessionId)))
      .orderBy(desc(agentMemory.createdAt))
      .limit(limit)

    return results.map(this.mapDbMemoryToMemoryEntry)
  }

  /**
   * Generate context summary
   */
  private async generateContextSummary(
    agentId: string,
    sessionId: string,
    recentMemories: MemoryEntry[],
    relevantMemories: MemoryEntry[]
  ): Promise<string> {
    // Simple summarization - in production, this could use an LLM
    const allMemories = [...recentMemories, ...relevantMemories]
    const uniqueMemories = Array.from(new Map(allMemories.map((m) => [m.id, m])).values())

    const summary = uniqueMemories
      .slice(0, 5)
      .map((m) => m.content.substring(0, 100))
      .join('. ')

    return summary || 'No relevant context available.'
  }

  /**
   * Update access patterns for memories
   */
  private async updateAccessPatterns(memoryIds: string[]): Promise<void> {
    if (memoryIds.length === 0) return

    try {
      await db
        .update(agentMemory)
        .set({
          lastAccessedAt: new Date(),
          accessCount: sql`${agentMemory.accessCount} + 1`,
        })
        .where(sql`${agentMemory.id} = ANY(${memoryIds})`)
    } catch (error) {
      console.error('Failed to update access patterns:', error)
    }
  }

  /**
   * Calculate similarity between embeddings
   */
  private calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    // Cosine similarity calculation
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  /**
   * Update memory cache
   */
  private updateMemoryCache(agentId: string, memory: MemoryEntry): void {
    const cacheKey = agentId
    const cached = this.memoryCache.get(cacheKey) || []

    cached.unshift(memory)

    // Trim cache
    if (cached.length > this.CACHE_SIZE) {
      cached.splice(this.CACHE_SIZE)
    }

    this.memoryCache.set(cacheKey, cached)
  }

  /**
   * Clear caches
   */
  private clearCaches(): void {
    this.memoryCache.clear()
    this.contextCache.clear()
  }

  /**
   * Map database memory to memory entry
   */
  private mapDbMemoryToMemoryEntry(dbMemory: any): MemoryEntry {
    return {
      id: dbMemory.id,
      agentId: dbMemory.agentId,
      sessionId: dbMemory.sessionId,
      type: dbMemory.type,
      content: dbMemory.content,
      embedding: dbMemory.embedding,
      metadata: dbMemory.metadata || {},
      createdAt: dbMemory.createdAt,
      updatedAt: dbMemory.updatedAt,
      lastAccessedAt: dbMemory.lastAccessedAt,
      accessCount: dbMemory.accessCount,
      expiresAt: dbMemory.expiresAt,
    }
  }
}

// Export singleton instance
export const agentMemorySystem = AgentMemorySystem.getInstance()
