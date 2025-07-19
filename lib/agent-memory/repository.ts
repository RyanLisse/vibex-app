/**
 * Agent Memory Repository
 *
 * Handles database operations for agent memory storage and retrieval.
 */

import { and, cosineDistance, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '@/db/config'
import { agentMemory } from '@/db/schema'
import type {
  CreateMemoryInput,
  MemoryBatchResult,
  MemoryEntry,
  MemoryImportance,
  MemorySearchOptions,
  UpdateMemoryInput,
} from './types'

export class MemoryRepository {
  /**
   * Create a new memory entry
   */
  async create(input: CreateMemoryInput): Promise<MemoryEntry> {
    const id = ulid()
    const now = new Date()

    const [created] = await db
      .insert(agentMemory)
      .values({
        id,
        agentType: input.agentType,
        contextKey: input.contextKey,
        content: input.content,
        embedding: input.embedding,
        metadata: input.metadata as any,
        importance: input.importance || 1,
        createdAt: now,
        lastAccessedAt: now,
        accessCount: 0,
        expiresAt: input.expiresAt,
      })
      .returning()

    return this.mapToMemoryEntry(created)
  }

  /**
   * Create multiple memory entries
   */
  async createBatch(inputs: CreateMemoryInput[]): Promise<MemoryBatchResult> {
    const succeeded: string[] = []
    const failed: Array<{ id?: string; error: string; input: any }> = []

    for (const input of inputs) {
      try {
        const memory = await this.create(input)
        succeeded.push(memory.id)
      } catch (error) {
        failed.push({
          error: error instanceof Error ? error.message : 'Unknown error',
          input,
        })
      }
    }

    return {
      succeeded,
      failed,
      totalProcessed: inputs.length,
    }
  }

  /**
   * Find memory by ID
   */
  async findById(id: string): Promise<MemoryEntry | null> {
    const [memory] = await db.select().from(agentMemory).where(eq(agentMemory.id, id)).limit(1)

    return memory ? this.mapToMemoryEntry(memory) : null
  }

  /**
   * Find memory by agent type and context key
   */
  async findByContext(agentType: string, contextKey: string): Promise<MemoryEntry | null> {
    const [memory] = await db
      .select()
      .from(agentMemory)
      .where(and(eq(agentMemory.agentType, agentType), eq(agentMemory.contextKey, contextKey)))
      .limit(1)

    return memory ? this.mapToMemoryEntry(memory) : null
  }

  /**
   * Update memory entry
   */
  async update(id: string, input: UpdateMemoryInput): Promise<MemoryEntry | null> {
    const updateData: any = {}

    if (input.content !== undefined) updateData.content = input.content
    if (input.embedding !== undefined) updateData.embedding = input.embedding
    if (input.importance !== undefined) updateData.importance = input.importance
    if (input.expiresAt !== undefined) updateData.expiresAt = input.expiresAt

    // Handle metadata update
    if (input.metadata) {
      updateData.metadata = sql`
        CASE 
          WHEN metadata IS NULL THEN ${JSON.stringify(input.metadata)}::jsonb
          ELSE metadata || ${JSON.stringify(input.metadata)}::jsonb
        END
      `
    }

    const [updated] = await db
      .update(agentMemory)
      .set(updateData)
      .where(eq(agentMemory.id, id))
      .returning()

    return updated ? this.mapToMemoryEntry(updated) : null
  }

  /**
   * Update access count and timestamp
   */
  async updateAccess(ids: string[]): Promise<void> {
    if (ids.length === 0) return

    await db
      .update(agentMemory)
      .set({
        lastAccessedAt: new Date(),
        accessCount: sql`${agentMemory.accessCount} + 1`,
      })
      .where(inArray(agentMemory.id, ids))
  }

  /**
   * Search memories with various filters
   */
  async search(options: MemorySearchOptions): Promise<MemoryEntry[]> {
    const conditions = []

    // Agent type filter
    if (options.agentType) {
      conditions.push(eq(agentMemory.agentType, options.agentType))
    }

    // Context key filter
    if (options.contextKey) {
      conditions.push(eq(agentMemory.contextKey, options.contextKey))
    }

    // Importance range filter
    if (options.importance) {
      if (options.importance.min !== undefined) {
        conditions.push(gte(agentMemory.importance, options.importance.min))
      }
      if (options.importance.max !== undefined) {
        conditions.push(lte(agentMemory.importance, options.importance.max))
      }
    }

    // Exclude expired memories unless requested
    if (!options.includeExpired) {
      conditions.push(
        sql`${agentMemory.expiresAt} IS NULL OR ${agentMemory.expiresAt} > CURRENT_TIMESTAMP`
      )
    }

    // Memory type filter
    if (options.types && options.types.length > 0) {
      conditions.push(sql`${agentMemory.metadata}->>'type' = ANY(${options.types})`)
    }

    // Tag filter
    if (options.tags && options.tags.length > 0) {
      conditions.push(sql`${agentMemory.metadata}->'tags' ?| ${options.tags}`)
    }

    // Text search in content
    if (options.query && !options.useSemanticSearch) {
      conditions.push(sql`${agentMemory.content} ILIKE ${`%${options.query}%`}`)
    }

    // Build query
    let query = db
      .select()
      .from(agentMemory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    // Apply ordering
    switch (options.orderBy) {
      case 'recency':
        query = query.orderBy(desc(agentMemory.lastAccessedAt))
        break
      case 'importance':
        query = query.orderBy(desc(agentMemory.importance))
        break
      case 'access_frequency':
        query = query.orderBy(desc(agentMemory.accessCount))
        break
      default:
        query = query.orderBy(desc(agentMemory.createdAt))
    }

    // Apply limit and offset
    if (options.limit) {
      query = query.limit(options.limit)
    }
    if (options.offset) {
      query = query.offset(options.offset)
    }

    const results = await query

    return results.map(this.mapToMemoryEntry)
  }

  /**
   * Semantic search using vector embeddings
   */
  async semanticSearch(
    queryEmbedding: number[],
    options: MemorySearchOptions
  ): Promise<Array<{ memory: MemoryEntry; similarity: number }>> {
    const conditions = []

    // Agent type filter
    if (options.agentType) {
      conditions.push(eq(agentMemory.agentType, options.agentType))
    }

    // Context key filter
    if (options.contextKey) {
      conditions.push(eq(agentMemory.contextKey, options.contextKey))
    }

    // Exclude expired memories
    if (!options.includeExpired) {
      conditions.push(
        sql`${agentMemory.expiresAt} IS NULL OR ${agentMemory.expiresAt} > CURRENT_TIMESTAMP`
      )
    }

    // Use cosine distance for similarity (lower is more similar)
    const results = await db
      .select({
        memory: agentMemory,
        distance: cosineDistance(agentMemory.embedding, queryEmbedding),
      })
      .from(agentMemory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(cosineDistance(agentMemory.embedding, queryEmbedding))
      .limit(options.limit || 20)

    // Convert distance to similarity score (1 - distance)
    return results
      .filter((result) => result.memory.embedding !== null)
      .map((result) => ({
        memory: this.mapToMemoryEntry(result.memory),
        similarity: 1 - (result.distance || 0),
      }))
      .filter((result) => result.similarity >= (options.threshold || 0.7))
  }

  /**
   * Get memories by agent type
   */
  async findByAgentType(agentType: string, limit = 100, offset = 0): Promise<MemoryEntry[]> {
    const results = await db
      .select()
      .from(agentMemory)
      .where(eq(agentMemory.agentType, agentType))
      .orderBy(desc(agentMemory.lastAccessedAt))
      .limit(limit)
      .offset(offset)

    return results.map(this.mapToMemoryEntry)
  }

  /**
   * Get recent memories
   */
  async getRecent(agentType: string, limit = 10, contextKey?: string): Promise<MemoryEntry[]> {
    const conditions = [eq(agentMemory.agentType, agentType)]

    if (contextKey) {
      conditions.push(eq(agentMemory.contextKey, contextKey))
    }

    const results = await db
      .select()
      .from(agentMemory)
      .where(and(...conditions))
      .orderBy(desc(agentMemory.createdAt))
      .limit(limit)

    return results.map(this.mapToMemoryEntry)
  }

  /**
   * Get most accessed memories
   */
  async getMostAccessed(agentType: string, limit = 10): Promise<MemoryEntry[]> {
    const results = await db
      .select()
      .from(agentMemory)
      .where(eq(agentMemory.agentType, agentType))
      .orderBy(desc(agentMemory.accessCount))
      .limit(limit)

    return results.map(this.mapToMemoryEntry)
  }

  /**
   * Archive old memories
   */
  async archiveOldMemories(agentType: string, olderThanDays: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const result = await db
      .update(agentMemory)
      .set({
        metadata: sql`
          jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{accessPattern}',
            '"archived"'
          )
        `,
      })
      .where(
        and(
          eq(agentMemory.agentType, agentType),
          lte(agentMemory.lastAccessedAt, cutoffDate),
          sql`${agentMemory.importance} < 8`
        )
      )

    return result.rowCount || 0
  }

  /**
   * Delete memory
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(agentMemory).where(eq(agentMemory.id, id))

    return (result.rowCount || 0) > 0
  }

  /**
   * Delete expired memories
   */
  async deleteExpired(): Promise<number> {
    const result = await db
      .delete(agentMemory)
      .where(and(sql`${agentMemory.expiresAt} IS NOT NULL`, lte(agentMemory.expiresAt, new Date())))

    return result.rowCount || 0
  }

  /**
   * Get memory statistics
   */
  async getStats(agentType?: string): Promise<{
    totalCount: number
    averageImportance: number
    averageAccessCount: number
    storageSize: number
  }> {
    const conditions = agentType ? [eq(agentMemory.agentType, agentType)] : []

    const [stats] = await db
      .select({
        totalCount: sql<number>`COUNT(*)::int`,
        averageImportance: sql<number>`AVG(${agentMemory.importance})::float`,
        averageAccessCount: sql<number>`AVG(${agentMemory.accessCount})::float`,
        storageSize: sql<number>`SUM(pg_column_size(${agentMemory}))::int`,
      })
      .from(agentMemory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    return {
      totalCount: stats?.totalCount || 0,
      averageImportance: stats?.averageImportance || 0,
      averageAccessCount: stats?.averageAccessCount || 0,
      storageSize: stats?.storageSize || 0,
    }
  }

  /**
   * Map database record to MemoryEntry
   */
  private mapToMemoryEntry(record: any): MemoryEntry {
    return {
      id: record.id,
      agentType: record.agentType,
      contextKey: record.contextKey,
      content: record.content,
      embedding: record.embedding,
      metadata: record.metadata || {},
      importance: record.importance,
      createdAt: record.createdAt,
      lastAccessedAt: record.lastAccessedAt,
      accessCount: record.accessCount,
      expiresAt: record.expiresAt,
    }
  }
}

// Export singleton instance
export const memoryRepository = new MemoryRepository()
