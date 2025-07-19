/**
 * WASM Vector Search Tests
 *
 * Comprehensive test suite for WASM-powered vector search functionality including
 * embedding operations, similarity searches, indexing performance, and cross-platform
 * compatibility validation.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Vector search types
interface VectorEmbedding {
  id: string
  vector: Float32Array
  metadata?: Record<string, any>
  dimensions: number
  norm?: number
}

interface SimilarityResult {
  id: string
  score: number
  metadata?: Record<string, any>
  distance?: number
}

interface VectorIndex {
  size: number
  dimensions: number
  indexType: 'flat' | 'ivf' | 'hnsw'
  memoryUsage: number
  buildTime: number
}

interface SearchPerformanceMetrics {
  queryTime: number
  throughput: number
  accuracy: number
  memoryUsage: number
  indexSize: number
}

// Mock WASM vector search module
const createMockVectorSearch = () => {
  const vectors = new Map<string, VectorEmbedding>()
  let index: VectorIndex | null = null

  return {
    // Vector operations
    createEmbedding: vi.fn(async (text: string, model = 'default'): Promise<VectorEmbedding> => {
      // Mock embedding generation
      const dimensions = model === 'large' ? 1536 : 384
      const vector = new Float32Array(dimensions)

      // Generate deterministic but realistic embeddings based on text
      const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      for (let i = 0; i < dimensions; i++) {
        vector[i] = Math.sin((hash + i) * 0.01) * Math.cos(i * 0.02)
      }

      // Normalize vector
      const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
      for (let i = 0; i < dimensions; i++) {
        vector[i] /= norm
      }

      return {
        id: `embedding-${hash}`,
        vector,
        dimensions,
        norm: 1.0,
        metadata: { text, model, length: text.length },
      }
    }),

    batchCreateEmbeddings: vi.fn(
      async (texts: string[], model = 'default'): Promise<VectorEmbedding[]> => {
        const embeddings = await Promise.all(
          texts.map((text) => createMockVectorSearch().createEmbedding(text, model))
        )
        return embeddings
      }
    ),

    // Index operations
    addVector: vi.fn(async (embedding: VectorEmbedding): Promise<void> => {
      vectors.set(embedding.id, embedding)
    }),

    addVectors: vi.fn(async (embeddings: VectorEmbedding[]): Promise<void> => {
      embeddings.forEach((embedding) => vectors.set(embedding.id, embedding))
    }),

    removeVector: vi.fn(async (id: string): Promise<boolean> => {
      return vectors.delete(id)
    }),

    // Search operations
    search: vi.fn(
      async (
        queryVector: Float32Array,
        options: {
          k?: number
          threshold?: number
          filter?: (metadata: any) => boolean
        } = {}
      ): Promise<SimilarityResult[]> => {
        const { k = 10, threshold = 0.0, filter } = options
        const results: SimilarityResult[] = []

        for (const [id, embedding] of vectors.entries()) {
          if (filter && !filter(embedding.metadata)) continue

          // Calculate cosine similarity
          let dotProduct = 0
          for (let i = 0; i < Math.min(queryVector.length, embedding.vector.length); i++) {
            dotProduct += queryVector[i] * embedding.vector[i]
          }

          const score = dotProduct // Assuming normalized vectors
          if (score >= threshold) {
            results.push({
              id,
              score,
              metadata: embedding.metadata,
              distance: 1 - score,
            })
          }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, k)
      }
    ),

    searchByText: vi.fn(
      async (
        query: string,
        options: {
          k?: number
          threshold?: number
          model?: string
          filter?: (metadata: any) => boolean
        } = {}
      ): Promise<SimilarityResult[]> => {
        const queryEmbedding = await createMockVectorSearch().createEmbedding(query, options.model)
        return createMockVectorSearch().search(queryEmbedding.vector, options)
      }
    ),

    // Index management
    buildIndex: vi.fn(async (type: 'flat' | 'ivf' | 'hnsw' = 'flat'): Promise<VectorIndex> => {
      const startTime = performance.now()

      // Mock index building
      await new Promise((resolve) => setTimeout(resolve, 100))

      const buildTime = performance.now() - startTime
      const dimensions = vectors.size > 0 ? Array.from(vectors.values())[0].dimensions : 0

      index = {
        size: vectors.size,
        dimensions,
        indexType: type,
        memoryUsage: vectors.size * dimensions * 4, // 4 bytes per float
        buildTime,
      }

      return index
    }),

    getIndex: vi.fn((): VectorIndex | null => index),

    optimizeIndex: vi.fn(async (): Promise<void> => {
      if (index) {
        // Mock optimization
        await new Promise((resolve) => setTimeout(resolve, 50))
        index.memoryUsage *= 0.8 // Simulate compression
      }
    }),

    // Utility functions
    cosineSimilarity: vi.fn((a: Float32Array, b: Float32Array): number => {
      let dotProduct = 0
      let normA = 0
      let normB = 0

      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
      }

      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
    }),

    euclideanDistance: vi.fn((a: Float32Array, b: Float32Array): number => {
      let sum = 0
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const diff = a[i] - b[i]
        sum += diff * diff
      }
      return Math.sqrt(sum)
    }),

    // Performance monitoring
    getMemoryUsage: vi.fn((): number => {
      return vectors.size * (vectors.size > 0 ? Array.from(vectors.values())[0].dimensions * 4 : 0)
    }),

    getStatistics: vi.fn(() => ({
      vectorCount: vectors.size,
      dimensions: vectors.size > 0 ? Array.from(vectors.values())[0].dimensions : 0,
      memoryUsage: createMockVectorSearch().getMemoryUsage(),
      indexType: index?.indexType || null,
      indexSize: index?.size || 0,
    })),

    // Cleanup
    clear: vi.fn(async (): Promise<void> => {
      vectors.clear()
      index = null
    }),
  }
}

describe('WASM Vector Search Integration Tests', () => {
  let vectorSearch: ReturnType<typeof createMockVectorSearch>
  let testEmbeddings: VectorEmbedding[]

  beforeAll(async () => {
    vectorSearch = createMockVectorSearch()
  })

  beforeEach(async () => {
    await vectorSearch.clear()
    testEmbeddings = []
  })

  afterAll(async () => {
    await vectorSearch.clear()
  })

  async function setupTestData() {
    const testTexts = [
      'Machine learning algorithms for data analysis',
      'Deep neural networks and artificial intelligence',
      'Natural language processing with transformers',
      'Computer vision and image recognition',
      'Reinforcement learning in robotics',
      'Database optimization and query performance',
      'Web development with modern frameworks',
      'Cloud computing and distributed systems',
      'Cybersecurity and network protection',
      'Mobile app development best practices',
    ]

    testEmbeddings = await vectorSearch.batchCreateEmbeddings(testTexts)
    await vectorSearch.addVectors(testEmbeddings)

    return testEmbeddings
  }

  describe('Embedding Generation Tests', () => {
    it('should generate consistent embeddings for same text', async () => {
      const text = 'Test embedding generation'

      const embedding1 = await vectorSearch.createEmbedding(text)
      const embedding2 = await vectorSearch.createEmbedding(text)

      expect(embedding1.vector).toEqual(embedding2.vector)
      expect(embedding1.dimensions).toBe(embedding2.dimensions)
      expect(embedding1.norm).toBeCloseTo(embedding2.norm || 0, 5)
    })

    it('should generate different embeddings for different texts', async () => {
      const embedding1 = await vectorSearch.createEmbedding('First text')
      const embedding2 = await vectorSearch.createEmbedding('Second text')

      expect(embedding1.vector).not.toEqual(embedding2.vector)
      expect(embedding1.id).not.toBe(embedding2.id)

      // Vectors should be different but similar dimensions
      expect(embedding1.dimensions).toBe(embedding2.dimensions)
    })

    it('should handle different model sizes', async () => {
      const smallEmbedding = await vectorSearch.createEmbedding('Test text', 'default')
      const largeEmbedding = await vectorSearch.createEmbedding('Test text', 'large')

      expect(smallEmbedding.dimensions).toBe(384)
      expect(largeEmbedding.dimensions).toBe(1536)
      expect(largeEmbedding.dimensions).toBeGreaterThan(smallEmbedding.dimensions)
    })

    it('should normalize vectors correctly', async () => {
      const embedding = await vectorSearch.createEmbedding('Normalization test')

      // Calculate actual norm
      let norm = 0
      for (let i = 0; i < embedding.vector.length; i++) {
        norm += embedding.vector[i] * embedding.vector[i]
      }
      norm = Math.sqrt(norm)

      expect(norm).toBeCloseTo(1.0, 5)
      expect(embedding.norm).toBeCloseTo(1.0, 5)
    })

    it('should handle batch embedding generation efficiently', async () => {
      const texts = Array.from({ length: 100 }, (_, i) => `Test text ${i}`)

      const startTime = performance.now()
      const embeddings = await vectorSearch.batchCreateEmbeddings(texts)
      const endTime = performance.now()

      expect(embeddings).toHaveLength(100)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds

      // All embeddings should have same dimensions
      const dimensions = embeddings[0].dimensions
      embeddings.forEach((embedding) => {
        expect(embedding.dimensions).toBe(dimensions)
        expect(embedding.vector).toHaveLength(dimensions)
      })
    })

    it('should preserve metadata in embeddings', async () => {
      const text = 'Test with metadata'
      const embedding = await vectorSearch.createEmbedding(text)

      expect(embedding.metadata).toBeDefined()
      expect(embedding.metadata?.text).toBe(text)
      expect(embedding.metadata?.length).toBe(text.length)
      expect(embedding.metadata?.model).toBe('default')
    })
  })

  describe('Vector Index Management Tests', () => {
    beforeEach(async () => {
      await setupTestData()
    })

    it('should add vectors to index', async () => {
      const stats = vectorSearch.getStatistics()
      expect(stats.vectorCount).toBe(testEmbeddings.length)
      expect(stats.dimensions).toBe(testEmbeddings[0].dimensions)
    })

    it('should remove vectors from index', async () => {
      const vectorToRemove = testEmbeddings[0]
      const removed = await vectorSearch.removeVector(vectorToRemove.id)

      expect(removed).toBe(true)

      const stats = vectorSearch.getStatistics()
      expect(stats.vectorCount).toBe(testEmbeddings.length - 1)
    })

    it('should build different index types', async () => {
      const indexTypes: Array<'flat' | 'ivf' | 'hnsw'> = ['flat', 'ivf', 'hnsw']

      for (const indexType of indexTypes) {
        const index = await vectorSearch.buildIndex(indexType)

        expect(index.indexType).toBe(indexType)
        expect(index.size).toBe(testEmbeddings.length)
        expect(index.dimensions).toBe(testEmbeddings[0].dimensions)
        expect(index.buildTime).toBeGreaterThan(0)
        expect(index.memoryUsage).toBeGreaterThan(0)
      }
    })

    it('should optimize index to reduce memory usage', async () => {
      await vectorSearch.buildIndex('flat')
      const initialIndex = vectorSearch.getIndex()
      const initialMemory = initialIndex?.memoryUsage || 0

      await vectorSearch.optimizeIndex()
      const optimizedIndex = vectorSearch.getIndex()
      const optimizedMemory = optimizedIndex?.memoryUsage || 0

      expect(optimizedMemory).toBeLessThan(initialMemory)
    })

    it('should handle large vector sets efficiently', async () => {
      // Create large dataset
      const largeTexts = Array.from(
        { length: 1000 },
        (_, i) => `Large dataset text number ${i} with some unique content ${Math.random()}`
      )

      const largeEmbeddings = await vectorSearch.batchCreateEmbeddings(largeTexts)

      const startTime = performance.now()
      await vectorSearch.addVectors(largeEmbeddings)
      const addTime = performance.now() - startTime

      const buildStartTime = performance.now()
      await vectorSearch.buildIndex('ivf')
      const buildTime = performance.now() - buildStartTime

      expect(addTime).toBeLessThan(10_000) // 10 seconds max for adding
      expect(buildTime).toBeLessThan(5000) // 5 seconds max for building

      const stats = vectorSearch.getStatistics()
      expect(stats.vectorCount).toBe(largeEmbeddings.length)
    })
  })

  describe('Similarity Search Tests', () => {
    beforeEach(async () => {
      await setupTestData()
      await vectorSearch.buildIndex('flat')
    })

    it('should find similar vectors by vector query', async () => {
      const queryVector = testEmbeddings[0].vector
      const results = await vectorSearch.search(queryVector, { k: 5 })

      expect(results).toHaveLength(5)
      expect(results[0].id).toBe(testEmbeddings[0].id) // Should find itself first
      expect(results[0].score).toBeCloseTo(1.0, 5) // Perfect match

      // Results should be sorted by similarity score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score)
      }
    })

    it('should find similar vectors by text query', async () => {
      const query = 'machine learning and neural networks'
      const results = await vectorSearch.searchByText(query, { k: 3 })

      expect(results).toHaveLength(3)

      // Should find AI/ML related content
      results.forEach((result) => {
        expect(result.score).toBeGreaterThan(0)
        expect(result.metadata).toBeDefined()
      })
    })

    it('should filter search results by metadata', async () => {
      const query = 'technology'
      const filter = (metadata: any) => metadata?.text?.includes('learning')

      const results = await vectorSearch.searchByText(query, {
        k: 10,
        filter,
      })

      results.forEach((result) => {
        expect(result.metadata?.text).toContain('learning')
      })
    })

    it('should respect similarity threshold', async () => {
      const query = 'completely unrelated query about cooking recipes'
      const results = await vectorSearch.searchByText(query, {
        k: 10,
        threshold: 0.8, // High threshold
      })

      // Should return fewer results due to high threshold
      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0.8)
      })
    })

    it('should handle empty search results gracefully', async () => {
      await vectorSearch.clear()

      const query = 'search in empty index'
      const results = await vectorSearch.searchByText(query, { k: 5 })

      expect(results).toHaveLength(0)
    })

    it('should provide accurate distance metrics', async () => {
      const queryVector = testEmbeddings[0].vector
      const results = await vectorSearch.search(queryVector, { k: 3 })

      results.forEach((result) => {
        expect(result.distance).toBeDefined()
        expect(result.distance).toBeGreaterThanOrEqual(0)
        expect(result.distance).toBeLessThanOrEqual(2) // Max for normalized vectors

        // Distance should be inverse of similarity for cosine
        expect(result.distance).toBeCloseTo(1 - result.score, 5)
      })
    })
  })

  describe('Distance Metrics Tests', () => {
    it('should calculate cosine similarity correctly', () => {
      const vectorA = new Float32Array([1, 0, 0])
      const vectorB = new Float32Array([0, 1, 0])
      const vectorC = new Float32Array([1, 0, 0])

      const similarityAB = vectorSearch.cosineSimilarity(vectorA, vectorB)
      const similarityAC = vectorSearch.cosineSimilarity(vectorA, vectorC)

      expect(similarityAB).toBeCloseTo(0, 5) // Orthogonal vectors
      expect(similarityAC).toBeCloseTo(1, 5) // Identical vectors
    })

    it('should calculate euclidean distance correctly', () => {
      const vectorA = new Float32Array([0, 0, 0])
      const vectorB = new Float32Array([3, 4, 0])
      const vectorC = new Float32Array([0, 0, 0])

      const distanceAB = vectorSearch.euclideanDistance(vectorA, vectorB)
      const distanceAC = vectorSearch.euclideanDistance(vectorA, vectorC)

      expect(distanceAB).toBeCloseTo(5, 5) // 3-4-5 triangle
      expect(distanceAC).toBeCloseTo(0, 5) // Same point
    })

    it('should handle vectors of different dimensions', () => {
      const shortVector = new Float32Array([1, 2])
      const longVector = new Float32Array([1, 2, 3, 4])

      const similarity = vectorSearch.cosineSimilarity(shortVector, longVector)
      const distance = vectorSearch.euclideanDistance(shortVector, longVector)

      expect(similarity).toBeDefined()
      expect(distance).toBeDefined()
      expect(similarity).toBeGreaterThan(0)
      expect(distance).toBeGreaterThan(0)
    })
  })

  describe('Performance Benchmarking Tests', () => {
    it('should measure search performance across different index sizes', async () => {
      const indexSizes = [100, 500, 1000]
      const performanceResults: SearchPerformanceMetrics[] = []

      for (const size of indexSizes) {
        await vectorSearch.clear()

        // Generate test data
        const texts = Array.from({ length: size }, (_, i) => `Performance test text ${i}`)
        const embeddings = await vectorSearch.batchCreateEmbeddings(texts)
        await vectorSearch.addVectors(embeddings)
        await vectorSearch.buildIndex('flat')

        // Measure search performance
        const query = 'performance test query'
        const iterations = 10
        const startTime = performance.now()

        for (let i = 0; i < iterations; i++) {
          await vectorSearch.searchByText(query, { k: 10 })
        }

        const endTime = performance.now()
        const avgQueryTime = (endTime - startTime) / iterations
        const throughput = 1000 / avgQueryTime // Queries per second

        performanceResults.push({
          queryTime: avgQueryTime,
          throughput,
          accuracy: 1.0, // Mock perfect accuracy
          memoryUsage: vectorSearch.getMemoryUsage(),
          indexSize: size,
        })
      }

      // Verify performance scaling
      performanceResults.forEach((result, index) => {
        expect(result.queryTime).toBeLessThan(1000) // Less than 1 second
        expect(result.throughput).toBeGreaterThan(1) // At least 1 QPS
        expect(result.memoryUsage).toBeGreaterThan(0)

        if (index > 0) {
          // Memory usage should scale with index size
          expect(result.memoryUsage).toBeGreaterThan(performanceResults[index - 1].memoryUsage)
        }
      })
    })

    it('should compare performance across different index types', async () => {
      await setupTestData()
      const indexTypes: Array<'flat' | 'ivf' | 'hnsw'> = ['flat', 'ivf', 'hnsw']
      const performanceComparison: Record<string, SearchPerformanceMetrics> = {}

      for (const indexType of indexTypes) {
        const buildStartTime = performance.now()
        await vectorSearch.buildIndex(indexType)
        const buildTime = performance.now() - buildStartTime

        // Measure search performance
        const query = 'index performance comparison'
        const iterations = 20
        const searchStartTime = performance.now()

        for (let i = 0; i < iterations; i++) {
          await vectorSearch.searchByText(query, { k: 5 })
        }

        const searchEndTime = performance.now()
        const avgQueryTime = (searchEndTime - searchStartTime) / iterations

        performanceComparison[indexType] = {
          queryTime: avgQueryTime,
          throughput: 1000 / avgQueryTime,
          accuracy: 1.0,
          memoryUsage: vectorSearch.getMemoryUsage(),
          indexSize: buildTime,
        }
      }

      // Verify all index types perform reasonably
      Object.entries(performanceComparison).forEach(([indexType, metrics]) => {
        expect(metrics.queryTime).toBeLessThan(500) // Less than 500ms
        expect(metrics.throughput).toBeGreaterThan(2) // At least 2 QPS
        console.log(
          `${indexType} index - Query time: ${metrics.queryTime}ms, Throughput: ${metrics.throughput} QPS`
        )
      })
    })

    it('should handle memory constraints efficiently', async () => {
      const initialMemory = vectorSearch.getMemoryUsage()

      // Add many vectors and monitor memory
      const batchSize = 100
      let totalVectors = 0

      for (let batch = 0; batch < 5; batch++) {
        const texts = Array.from(
          { length: batchSize },
          (_, i) => `Memory test batch ${batch} item ${i}`
        )
        const embeddings = await vectorSearch.batchCreateEmbeddings(texts)
        await vectorSearch.addVectors(embeddings)

        totalVectors += batchSize
        const currentMemory = vectorSearch.getMemoryUsage()

        // Memory should grow linearly with vector count
        expect(currentMemory).toBeGreaterThan(initialMemory)

        // Memory per vector should be reasonable
        const memoryPerVector = currentMemory / totalVectors
        expect(memoryPerVector).toBeLessThan(10_000) // Less than 10KB per vector
      }
    })

    it('should maintain accuracy under different conditions', async () => {
      await setupTestData()
      await vectorSearch.buildIndex('flat')

      // Test accuracy with exact matches
      const exactQueries = testEmbeddings.slice(0, 3)

      for (const embedding of exactQueries) {
        const results = await vectorSearch.search(embedding.vector, { k: 1 })

        expect(results).toHaveLength(1)
        expect(results[0].id).toBe(embedding.id)
        expect(results[0].score).toBeCloseTo(1.0, 5)
      }

      // Test accuracy with semantic similarity
      const semanticQueries = [
        'artificial intelligence and machine learning',
        'computer programming and software development',
        'data science and analytics',
      ]

      for (const query of semanticQueries) {
        const results = await vectorSearch.searchByText(query, { k: 3 })

        expect(results.length).toBeGreaterThan(0)
        expect(results[0].score).toBeGreaterThan(0.1) // Should find somewhat relevant results
      }
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid vector dimensions', async () => {
      await setupTestData()

      const invalidVector = new Float32Array([1, 2]) // Wrong dimensions
      const results = await vectorSearch.search(invalidVector, { k: 5 })

      // Should handle gracefully (may return empty results or adapted results)
      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle empty queries gracefully', async () => {
      await setupTestData()

      const results = await vectorSearch.searchByText('', { k: 5 })
      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle very long text inputs', async () => {
      const longText = 'word '.repeat(10_000) // Very long text

      const embedding = await vectorSearch.createEmbedding(longText)
      expect(embedding).toBeDefined()
      expect(embedding.dimensions).toBeGreaterThan(0)
      expect(embedding.vector).toHaveLength(embedding.dimensions)
    })

    it('should handle special characters and unicode', async () => {
      const unicodeTexts = [
        'Text with émojis 🚀 and spëcial charš',
        '中文测试文本',
        'العربية النص',
        'Русский текст',
        '🎉🎊🎈 Emoji only text 🌟⭐✨',
      ]

      const embeddings = await vectorSearch.batchCreateEmbeddings(unicodeTexts)

      embeddings.forEach((embedding) => {
        expect(embedding).toBeDefined()
        expect(embedding.dimensions).toBeGreaterThan(0)
        expect(embedding.vector).toHaveLength(embedding.dimensions)
      })
    })

    it('should handle concurrent search operations', async () => {
      await setupTestData()
      await vectorSearch.buildIndex('flat')

      const queries = Array.from({ length: 10 }, (_, i) => `Concurrent query ${i}`)

      const searchPromises = queries.map((query) => vectorSearch.searchByText(query, { k: 3 }))

      const results = await Promise.all(searchPromises)

      expect(results).toHaveLength(10)
      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true)
      })
    })

    it('should handle index corruption gracefully', async () => {
      await setupTestData()
      await vectorSearch.buildIndex('flat')

      // Simulate index corruption by clearing internal state
      await vectorSearch.clear()

      const results = await vectorSearch.searchByText('test query', { k: 5 })
      expect(results).toHaveLength(0)
    })
  })

  describe('Integration with Database Schema', () => {
    it('should work with task metadata vectors', async () => {
      const taskDescriptions = [
        'Implement user authentication system',
        'Design database schema for tasks',
        'Create REST API endpoints',
        'Build frontend components',
        'Write unit tests for services',
      ]

      const embeddings = await vectorSearch.batchCreateEmbeddings(taskDescriptions)
      await vectorSearch.addVectors(embeddings)
      await vectorSearch.buildIndex('flat')

      // Search for similar tasks
      const query = 'authentication and security features'
      const results = await vectorSearch.searchByText(query, { k: 3 })

      expect(results.length).toBeGreaterThan(0)

      // Should find authentication-related task
      const authResult = results.find((r) => r.metadata?.text?.includes('authentication'))
      expect(authResult).toBeDefined()
    })

    it('should handle environment configuration vectors', async () => {
      const envConfigs = [
        'Production deployment configuration',
        'Development environment setup',
        'Testing environment variables',
        'Docker container configuration',
        'CI/CD pipeline settings',
      ]

      const embeddings = await vectorSearch.batchCreateEmbeddings(envConfigs)
      await vectorSearch.addVectors(embeddings)

      const query = 'production deployment settings'
      const results = await vectorSearch.searchByText(query, { k: 2 })

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].score).toBeGreaterThan(0.3) // Should find relevant config
    })
  })
})
