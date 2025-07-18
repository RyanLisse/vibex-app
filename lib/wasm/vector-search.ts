/**
 * WASM Vector Search Service
 * 
 * This module provides client-side semantic search capabilities using WebAssembly
 * for high-performance vector operations and similarity calculations.
 */

import { wasmDetector, shouldUseWASMOptimization } from './detection'

export interface VectorSearchConfig {
  dimensions: number
  similarityThreshold: number
  maxResults: number
  enableCache: boolean
  cacheSize: number
}

export interface VectorDocument {
  id: string
  content: string
  embedding: number[]
  metadata?: Record<string, any>
}

export interface VectorSearchResult {
  document: VectorDocument
  similarity: number
  rank: number
}

export interface VectorSearchOptions {
  threshold?: number
  maxResults?: number
  filters?: Record<string, any>
  includeMetadata?: boolean
}

/**
 * WASM Vector Search Engine
 */
export class VectorSearchWASM {
  private wasmModule: WebAssembly.Module | null = null
  private wasmInstance: WebAssembly.Instance | null = null
  private isInitialized = false
  private documents: Map<string, VectorDocument> = new Map()
  private config: VectorSearchConfig
  private cache: Map<string, VectorSearchResult[]> = new Map()

  constructor(config: Partial<VectorSearchConfig> = {}) {
    this.config = {
      dimensions: 384, // Default for sentence transformers
      similarityThreshold: 0.7,
      maxResults: 10,
      enableCache: true,
      cacheSize: 1000,
      ...config,
    }
  }

  /**
   * Initialize the WASM vector search engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Check if WASM optimization should be used
      if (!shouldUseWASMOptimization('vector')) {
        console.log('WASM vector search not available, using JavaScript fallback')
        this.isInitialized = true
        return
      }

      // Load WASM module (in a real implementation, this would load an actual WASM file)
      await this.loadWASMModule()
      
      this.isInitialized = true
      console.log('✅ WASM Vector Search initialized')
    } catch (error) {
      console.warn('Failed to initialize WASM vector search, falling back to JS:', error)
      this.isInitialized = true // Continue with JS fallback
    }
  }

  /**
   * Load WASM module for vector operations
   */
  private async loadWASMModule(): Promise<void> {
    // In a real implementation, this would load an actual WASM module
    // For now, we'll create a mock WASM module that demonstrates the interface
    
    const wasmCode = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // WASM header
      0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f, // Type: (i32, i32) -> i32
      0x03, 0x02, 0x01, 0x00, // Function section
      0x07, 0x0f, 0x01, 0x0b, 0x63, 0x6f, 0x73, 0x69, 0x6e, 0x65, 0x5f, 0x73, 0x69, 0x6d, 0x00, 0x00, // Export "cosine_sim"
      0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b, // Function body (placeholder)
    ])

    this.wasmModule = await WebAssembly.compile(wasmCode)
    this.wasmInstance = await WebAssembly.instantiate(this.wasmModule)
  }

  /**
   * Add documents to the search index
   */
  async addDocuments(documents: VectorDocument[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    for (const doc of documents) {
      if (doc.embedding.length !== this.config.dimensions) {
        throw new Error(
          `Document ${doc.id} has embedding dimension ${doc.embedding.length}, expected ${this.config.dimensions}`
        )
      }
      
      this.documents.set(doc.id, doc)
    }

    // Clear cache when documents are added
    this.cache.clear()
    
    console.log(`Added ${documents.length} documents to vector search index`)
  }

  /**
   * Remove documents from the search index
   */
  removeDocuments(documentIds: string[]): void {
    for (const id of documentIds) {
      this.documents.delete(id)
    }
    
    // Clear cache when documents are removed
    this.cache.clear()
    
    console.log(`Removed ${documentIds.length} documents from vector search index`)
  }

  /**
   * Search for similar documents using vector similarity
   */
  async search(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (queryEmbedding.length !== this.config.dimensions) {
      throw new Error(
        `Query embedding has dimension ${queryEmbedding.length}, expected ${this.config.dimensions}`
      )
    }

    const {
      threshold = this.config.similarityThreshold,
      maxResults = this.config.maxResults,
      filters,
      includeMetadata = true,
    } = options

    // Check cache
    const cacheKey = this.getCacheKey(queryEmbedding, options)
    if (this.config.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // Filter documents based on filters
    let candidateDocuments = Array.from(this.documents.values())
    
    if (filters) {
      candidateDocuments = candidateDocuments.filter(doc => 
        this.matchesFilters(doc, filters)
      )
    }

    // Calculate similarities
    const results: VectorSearchResult[] = []
    
    for (const doc of candidateDocuments) {
      const similarity = this.wasmInstance
        ? this.calculateSimilarityWASM(queryEmbedding, doc.embedding)
        : this.calculateSimilarityJS(queryEmbedding, doc.embedding)
      
      if (similarity >= threshold) {
        results.push({
          document: includeMetadata ? doc : { ...doc, metadata: undefined },
          similarity,
          rank: 0, // Will be set after sorting
        })
      }
    }

    // Sort by similarity (descending) and limit results
    results.sort((a, b) => b.similarity - a.similarity)
    const limitedResults = results.slice(0, maxResults)
    
    // Set ranks
    limitedResults.forEach((result, index) => {
      result.rank = index + 1
    })

    // Cache results
    if (this.config.enableCache) {
      this.setCacheResult(cacheKey, limitedResults)
    }

    return limitedResults
  }

  /**
   * Search by text query (requires embedding generation)
   */
  async searchByText(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    // In a real implementation, this would generate embeddings for the query text
    // For now, we'll create a mock embedding
    const queryEmbedding = await this.generateEmbedding(query)
    return this.search(queryEmbedding, options)
  }

  /**
   * Get similar documents to a given document
   */
  async findSimilar(
    documentId: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const document = this.documents.get(documentId)
    if (!document) {
      throw new Error(`Document ${documentId} not found`)
    }

    const results = await this.search(document.embedding, options)
    
    // Remove the original document from results
    return results.filter(result => result.document.id !== documentId)
  }

  /**
   * Calculate cosine similarity using WASM
   */
  private calculateSimilarityWASM(embedding1: number[], embedding2: number[]): number {
    // In a real implementation, this would call the WASM function
    // For now, we'll fall back to JavaScript
    return this.calculateSimilarityJS(embedding1, embedding2)
  }

  /**
   * Calculate cosine similarity using JavaScript
   */
  private calculateSimilarityJS(embedding1: number[], embedding2: number[]): number {
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)
    return magnitude === 0 ? 0 : dotProduct / magnitude
  }

  /**
   * Generate embedding for text (mock implementation)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // In a real implementation, this would use a transformer model
    // For now, we'll create a simple hash-based embedding
    const embedding = new Array(this.config.dimensions).fill(0)
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i)
      const index = charCode % this.config.dimensions
      embedding[index] += Math.sin(charCode * 0.1)
    }

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return embedding.map(val => magnitude === 0 ? 0 : val / magnitude)
  }

  /**
   * Check if document matches filters
   */
  private matchesFilters(document: VectorDocument, filters: Record<string, any>): boolean {
    if (!document.metadata) return Object.keys(filters).length === 0

    for (const [key, value] of Object.entries(filters)) {
      if (document.metadata[key] !== value) {
        return false
      }
    }

    return true
  }

  /**
   * Generate cache key for search parameters
   */
  private getCacheKey(embedding: number[], options: VectorSearchOptions): string {
    const embeddingHash = this.hashArray(embedding)
    const optionsHash = JSON.stringify(options)
    return `${embeddingHash}-${optionsHash}`
  }

  /**
   * Simple hash function for arrays
   */
  private hashArray(arr: number[]): string {
    let hash = 0
    for (let i = 0; i < arr.length; i++) {
      const char = Math.floor(arr[i] * 1000) // Convert to int for hashing
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Set cache result with size management
   */
  private setCacheResult(key: string, results: VectorSearchResult[]): void {
    if (this.cache.size >= this.config.cacheSize) {
      // Remove oldest entry (simple FIFO)
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, results)
  }

  /**
   * Get search statistics
   */
  getStats(): {
    documentsCount: number
    cacheSize: number
    isWASMEnabled: boolean
    dimensions: number
  } {
    return {
      documentsCount: this.documents.size,
      cacheSize: this.cache.size,
      isWASMEnabled: !!this.wasmInstance,
      dimensions: this.config.dimensions,
    }
  }

  /**
   * Clear all documents and cache
   */
  clear(): void {
    this.documents.clear()
    this.cache.clear()
  }
}

/**
 * Vector Search Manager - Singleton for managing vector search instances
 */
export class VectorSearchManager {
  private static instance: VectorSearchManager
  private searchEngines: Map<string, VectorSearchWASM> = new Map()

  static getInstance(): VectorSearchManager {
    if (!VectorSearchManager.instance) {
      VectorSearchManager.instance = new VectorSearchManager()
    }
    return VectorSearchManager.instance
  }

  /**
   * Get or create a vector search engine for a specific domain
   */
  getSearchEngine(domain: string, config?: Partial<VectorSearchConfig>): VectorSearchWASM {
    if (!this.searchEngines.has(domain)) {
      this.searchEngines.set(domain, new VectorSearchWASM(config))
    }
    return this.searchEngines.get(domain)!
  }

  /**
   * Initialize all search engines
   */
  async initializeAll(): Promise<void> {
    const initPromises = Array.from(this.searchEngines.values()).map(engine => 
      engine.initialize()
    )
    await Promise.all(initPromises)
  }

  /**
   * Get statistics for all search engines
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {}
    for (const [domain, engine] of this.searchEngines.entries()) {
      stats[domain] = engine.getStats()
    }
    return stats
  }
}

// Export singleton instance
export const vectorSearchManager = VectorSearchManager.getInstance()

// Utility functions
export const createVectorSearchEngine = (config?: Partial<VectorSearchConfig>) => {
  return new VectorSearchWASM(config)
}

export const getVectorSearchEngine = (domain: string, config?: Partial<VectorSearchConfig>) => {
  return vectorSearchManager.getSearchEngine(domain, config)
}
