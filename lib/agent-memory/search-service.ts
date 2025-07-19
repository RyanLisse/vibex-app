/**
 * Agent Memory Search Service
 *
 * Provides advanced search capabilities for agent memories using
 * vector embeddings and semantic search.
 */

import { observability } from '@/lib/observability'
import { wasmServices } from '@/lib/wasm/services'
import { memoryRepository } from './repository'
import type { MemoryEntry, MemorySearchOptions, MemorySearchResult, MemoryType } from './types'

export class MemorySearchService {
  private static instance: MemorySearchService
  private searchCache: Map<string, MemorySearchResult[]> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly CACHE_SIZE = 100

  private constructor() {}

  static getInstance(): MemorySearchService {
    if (!MemorySearchService.instance) {
      MemorySearchService.instance = new MemorySearchService()
    }
    return MemorySearchService.instance
  }

  /**
   * Search memories using text query
   */
  async search(query: string, options: MemorySearchOptions = {}): Promise<MemorySearchResult[]> {
    const startTime = Date.now()

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(query, options)
      const cached = this.getCachedResults(cacheKey)
      if (cached) {
        observability.metrics.recordOperation('memory_search_cache_hit', 0)
        return cached
      }

      let results: MemorySearchResult[]

      if (options.useSemanticSearch !== false && wasmServices.isReady()) {
        // Perform semantic search using vector embeddings
        results = await this.semanticSearch(query, options)
      } else {
        // Fallback to text search
        results = await this.textSearch(query, options)
      }

      // Cache results
      this.setCachedResults(cacheKey, results)

      const duration = Date.now() - startTime
      observability.metrics.recordOperation('memory_search', duration)

      await observability.recordEvent('memory_search', {
        query: query.substring(0, 50),
        resultCount: results.length,
        searchType: options.useSemanticSearch !== false ? 'semantic' : 'text',
        duration,
      })

      return results
    } catch (error) {
      observability.recordError('memory_search', error as Error)
      throw error
    }
  }

  /**
   * Find similar memories to a given memory
   */
  async findSimilar(
    memoryId: string,
    options: MemorySearchOptions = {}
  ): Promise<MemorySearchResult[]> {
    const memory = await memoryRepository.findById(memoryId)
    if (!memory) {
      throw new Error(`Memory ${memoryId} not found`)
    }

    // Use the memory's embedding for similarity search
    if (memory.embedding) {
      const results = await memoryRepository.semanticSearch(memory.embedding, {
        ...options,
        limit: options.limit || 10,
      })

      return results
        .filter((result) => result.memory.id !== memoryId)
        .map((result) => this.createSearchResult(result.memory, result.similarity))
    }

    // Fallback to content-based search
    return this.search(memory.content.substring(0, 200), {
      ...options,
      agentType: memory.agentType,
    })
  }

  /**
   * Search memories by type
   */
  async searchByType(
    types: MemoryType[],
    options: MemorySearchOptions = {}
  ): Promise<MemorySearchResult[]> {
    const memories = await memoryRepository.search({
      ...options,
      types,
    })

    return memories.map((memory) => this.createSearchResult(memory, 1.0))
  }

  /**
   * Search memories by tags
   */
  async searchByTags(
    tags: string[],
    options: MemorySearchOptions = {}
  ): Promise<MemorySearchResult[]> {
    const memories = await memoryRepository.search({
      ...options,
      tags,
    })

    return memories.map((memory) => this.createSearchResult(memory, 1.0))
  }

  /**
   * Perform semantic search using vector embeddings
   */
  private async semanticSearch(
    query: string,
    options: MemorySearchOptions
  ): Promise<MemorySearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query)

      // Search using vector similarity
      const results = await memoryRepository.semanticSearch(queryEmbedding, options)

      // Calculate comprehensive scores
      return results.map((result) => {
        const memory = result.memory
        const semanticScore = result.similarity

        // Calculate other scoring factors
        const recencyScore = this.calculateRecencyScore(memory.lastAccessedAt)
        const importanceScore = memory.importance / 10
        const accessScore = Math.min(memory.accessCount / 100, 1)

        // Weighted total score
        const totalScore =
          semanticScore * 0.4 + recencyScore * 0.2 + importanceScore * 0.3 + accessScore * 0.1

        return this.createSearchResult(memory, totalScore, {
          semantic: semanticScore,
          recency: recencyScore,
          importance: importanceScore,
          accessFrequency: accessScore,
        })
      })
    } catch (error) {
      console.warn('Semantic search failed, falling back to text search:', error)
      return this.textSearch(query, options)
    }
  }

  /**
   * Perform text-based search
   */
  private async textSearch(
    query: string,
    options: MemorySearchOptions
  ): Promise<MemorySearchResult[]> {
    const memories = await memoryRepository.search({
      ...options,
      query,
    })

    // Calculate relevance scores based on text matching
    return memories.map((memory) => {
      const contentLower = memory.content.toLowerCase()
      const queryLower = query.toLowerCase()
      const queryTerms = queryLower.split(/\s+/)

      // Calculate term frequency
      let matchCount = 0
      const totalTerms = queryTerms.length

      for (const term of queryTerms) {
        if (contentLower.includes(term)) {
          matchCount++
        }
      }

      const textScore = totalTerms > 0 ? matchCount / totalTerms : 0
      const recencyScore = this.calculateRecencyScore(memory.lastAccessedAt)
      const importanceScore = memory.importance / 10
      const accessScore = Math.min(memory.accessCount / 100, 1)

      const totalScore =
        textScore * 0.5 + recencyScore * 0.2 + importanceScore * 0.2 + accessScore * 0.1

      return this.createSearchResult(memory, totalScore, {
        semantic: textScore,
        recency: recencyScore,
        importance: importanceScore,
        accessFrequency: accessScore,
      })
    })
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const vectorSearch = wasmServices.getVectorSearch()

      // Use WASM-optimized embedding generation
      const embedding = await vectorSearch['generateEmbedding'](text)

      return embedding
    } catch (error) {
      // Fallback to simple hash-based embedding
      return this.generateSimpleEmbedding(text)
    }
  }

  /**
   * Generate simple embedding without WASM
   */
  private generateSimpleEmbedding(text: string, dimensions = 1536): number[] {
    const embedding = new Array(dimensions).fill(0)
    const tokens = text.toLowerCase().split(/\s+/)

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      for (let j = 0; j < token.length; j++) {
        const charCode = token.charCodeAt(j)
        const index = (charCode * (i + 1) * (j + 1)) % dimensions
        embedding[index] += Math.sin(charCode * 0.01) / tokens.length
      }
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return magnitude > 0 ? embedding.map((val) => val / magnitude) : embedding
  }

  /**
   * Calculate recency score based on last access time
   */
  private calculateRecencyScore(lastAccessedAt: Date): number {
    const now = Date.now()
    const timeDiff = now - lastAccessedAt.getTime()
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24)

    // Exponential decay over 30 days
    return Math.exp(-daysDiff / 30)
  }

  /**
   * Create search result with scoring
   */
  private createSearchResult(
    memory: MemoryEntry,
    totalScore: number,
    scores?: {
      semantic: number
      recency: number
      importance: number
      accessFrequency: number
    }
  ): MemorySearchResult {
    return {
      memory,
      score: {
        semantic: scores?.semantic || totalScore,
        recency: scores?.recency || this.calculateRecencyScore(memory.lastAccessedAt),
        importance: scores?.importance || memory.importance / 10,
        accessFrequency: scores?.accessFrequency || Math.min(memory.accessCount / 100, 1),
        total: totalScore,
      },
      highlights: [], // TODO: Implement text highlighting
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(query: string, options: MemorySearchOptions): string {
    const optionStr = JSON.stringify({
      agentType: options.agentType,
      contextKey: options.contextKey,
      types: options.types,
      tags: options.tags,
      limit: options.limit,
    })
    return `${query}:${optionStr}`
  }

  /**
   * Get cached results
   */
  private getCachedResults(key: string): MemorySearchResult[] | null {
    const cached = this.searchCache.get(key)
    if (!cached) return null

    // Check if cache is still valid
    const cacheData = cached as any
    if (cacheData.timestamp && Date.now() - cacheData.timestamp > this.CACHE_TTL) {
      this.searchCache.delete(key)
      return null
    }

    return cached
  }

  /**
   * Set cached results
   */
  private setCachedResults(key: string, results: MemorySearchResult[]): void {
    // Limit cache size
    if (this.searchCache.size >= this.CACHE_SIZE) {
      const firstKey = this.searchCache.keys().next().value
      this.searchCache.delete(firstKey)
    }

    // Store with timestamp
    const cachedData = results as any
    cachedData.timestamp = Date.now()
    this.searchCache.set(key, cachedData)
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear()
  }

  /**
   * Warm up search index
   */
  async warmUp(agentType: string): Promise<void> {
    try {
      // Pre-load recent and important memories
      const recentMemories = await memoryRepository.getRecent(agentType, 50)
      const importantMemories = await memoryRepository.search({
        agentType,
        importance: { min: 7 },
        limit: 50,
      })

      // Generate embeddings for memories without them
      const memories = [...recentMemories, ...importantMemories]
      const uniqueMemories = Array.from(new Map(memories.map((m) => [m.id, m])).values())

      for (const memory of uniqueMemories) {
        if (!memory.embedding) {
          const embedding = await this.generateEmbedding(memory.content)
          await memoryRepository.update(memory.id, { embedding })
        }
      }

      console.log(`Warmed up search index for ${agentType} with ${uniqueMemories.length} memories`)
    } catch (error) {
      console.error('Failed to warm up search index:', error)
    }
  }
}

// Export singleton instance
export const memorySearchService = MemorySearchService.getInstance()
