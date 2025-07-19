/**
 * Test suite for Vector Search WASM module integration
 */

import { VectorSearchWASM } from '../vector-search'

export async function testVectorSearchIntegration(): Promise<{
  success: boolean
  results: string[]
  errors: string[]
}> {
  const results: string[] = []
  const errors: string[] = []

  try {
    // Test 1: Basic initialization
    results.push('Starting Vector Search WASM integration test...')

    const vectorSearch = new VectorSearchWASM({
      dimensions: 128,
      similarityThreshold: 0.7,
      maxResults: 5,
    })

    // Test 2: Initialize the module
    results.push('Initializing vector search module...')
    await vectorSearch.initialize()
    results.push('✅ Vector search initialized successfully')

    // Test 3: Add test documents
    results.push('Adding test documents...')
    const testDocuments = [
      {
        id: 'doc1',
        content: 'Machine learning and artificial intelligence',
        embedding: Array.from({ length: 128 }, () => Math.random()),
      },
      {
        id: 'doc2',
        content: 'Deep learning neural networks',
        embedding: Array.from({ length: 128 }, () => Math.random()),
      },
      {
        id: 'doc3',
        content: 'Natural language processing',
        embedding: Array.from({ length: 128 }, () => Math.random()),
      },
    ]

    await vectorSearch.addDocuments(testDocuments)
    results.push('✅ Test documents added successfully')

    // Test 4: Perform similarity search
    results.push('Performing similarity search...')
    const queryEmbedding = Array.from({ length: 128 }, () => Math.random())

    const searchResults = await vectorSearch.search(queryEmbedding, {
      maxResults: 3,
      threshold: 0.0, // Use low threshold for testing
    })

    results.push(`✅ Search completed: Found ${searchResults.length} results`)

    // Test 5: Test search by text
    results.push('Testing text-based search...')
    const textResults = await vectorSearch.searchByText('machine learning', {
      maxResults: 2,
    })

    results.push(`✅ Text search completed: Found ${textResults.length} results`)

    // Test 6: Get statistics
    results.push('Getting vector search statistics...')
    const stats = vectorSearch.getStats()
    results.push(
      `✅ Statistics retrieved: ${stats.documentsCount} documents, WASM enabled: ${stats.isWASMEnabled}`
    )

    // Test 7: Warm up WASM module
    results.push('Warming up WASM module...')
    await vectorSearch.warmUp()
    results.push('✅ WASM module warmed up successfully')

    // Test 8: Test performance with larger dataset
    results.push('Testing performance with larger dataset...')
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      id: `large_doc_${i}`,
      content: `Document ${i} with random content`,
      embedding: Array.from({ length: 128 }, () => Math.random()),
    }))

    await vectorSearch.addDocuments(largeDataset)

    const startTime = Date.now()
    const largeSearchResults = await vectorSearch.search(queryEmbedding, {
      maxResults: 10,
      threshold: 0.0,
    })
    const searchTime = Date.now() - startTime

    results.push(`✅ Large dataset search: ${largeSearchResults.length} results in ${searchTime}ms`)

    // Test 9: Memory statistics
    results.push('Getting memory statistics...')
    const memoryStats = vectorSearch.getMemoryStats()
    results.push(
      `✅ Memory stats: ${memoryStats.documentsMemoryEstimate} bytes estimated for documents`
    )

    // Test 10: Cleanup
    results.push('Cleaning up resources...')
    vectorSearch.clear()
    results.push('✅ Cleanup completed successfully')

    return {
      success: true,
      results,
      errors,
    }
  } catch (error) {
    errors.push(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`)

    return {
      success: false,
      results,
      errors,
    }
  }
}

/**
 * Performance benchmark for Vector Search
 */
export async function benchmarkVectorSearch(): Promise<{
  success: boolean
  benchmarkResults: Record<string, number>
  details: string[]
}> {
  const details: string[] = []
  const benchmarkResults: Record<string, number> = {}

  try {
    const vectorSearch = new VectorSearchWASM({
      dimensions: 384,
      similarityThreshold: 0.7,
      maxResults: 10,
    })

    await vectorSearch.initialize()
    details.push('Vector Search initialized for benchmarking')

    // Benchmark 1: Document addition performance
    const addStartTime = Date.now()
    const documents = Array.from({ length: 1000 }, (_, i) => ({
      id: `bench_doc_${i}`,
      content: `Benchmark document ${i}`,
      embedding: Array.from({ length: 384 }, () => Math.random()),
    }))

    await vectorSearch.addDocuments(documents)
    const addTime = Date.now() - addStartTime
    benchmarkResults.documentAdditionMs = addTime
    details.push(`Document addition: ${addTime}ms for 1000 documents`)

    // Benchmark 2: Single search performance
    const queryEmbedding = Array.from({ length: 384 }, () => Math.random())

    const searchStartTime = Date.now()
    await vectorSearch.search(queryEmbedding)
    const searchTime = Date.now() - searchStartTime
    benchmarkResults.singleSearchMs = searchTime
    details.push(`Single search: ${searchTime}ms`)

    // Benchmark 3: Batch search performance
    const batchStartTime = Date.now()
    const batchPromises = Array.from({ length: 10 }, () =>
      vectorSearch.search(Array.from({ length: 384 }, () => Math.random()))
    )
    await Promise.all(batchPromises)
    const batchTime = Date.now() - batchStartTime
    benchmarkResults.batchSearchMs = batchTime
    details.push(`Batch search (10 queries): ${batchTime}ms`)

    // Benchmark 4: Text search performance
    const textSearchStartTime = Date.now()
    await vectorSearch.searchByText('benchmark test query')
    const textSearchTime = Date.now() - textSearchStartTime
    benchmarkResults.textSearchMs = textSearchTime
    details.push(`Text search: ${textSearchTime}ms`)

    // Calculate derived metrics
    benchmarkResults.documentsPerSecond = (1000 / addTime) * 1000
    benchmarkResults.searchesPerSecond = (10 / batchTime) * 1000

    details.push(
      `Performance: ${benchmarkResults.documentsPerSecond.toFixed(0)} docs/sec, ${benchmarkResults.searchesPerSecond.toFixed(0)} searches/sec`
    )

    vectorSearch.clear()

    return {
      success: true,
      benchmarkResults,
      details,
    }
  } catch (error) {
    details.push(`❌ Benchmark failed: ${error instanceof Error ? error.message : String(error)}`)

    return {
      success: false,
      benchmarkResults,
      details,
    }
  }
}

/**
 * Run all tests and benchmarks
 */
export async function runAllVectorSearchTests(): Promise<void> {
  console.log('🚀 Starting Vector Search WASM Module Tests\n')

  // Run integration test
  console.log('Running integration tests...')
  const integrationResult = await testVectorSearchIntegration()

  if (integrationResult.success) {
    console.log('✅ Integration tests passed\n')
    integrationResult.results.forEach((result) => console.log(result))
  } else {
    console.log('❌ Integration tests failed\n')
    integrationResult.errors.forEach((error) => console.log(error))
    return
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // Run benchmark
  console.log('Running performance benchmarks...')
  const benchmarkResult = await benchmarkVectorSearch()

  if (benchmarkResult.success) {
    console.log('✅ Benchmarks completed\n')
    benchmarkResult.details.forEach((detail) => console.log(detail))
    console.log('\nBenchmark Results:')
    Object.entries(benchmarkResult.benchmarkResults).forEach(([key, value]) => {
      console.log(`  ${key}: ${typeof value === 'number' ? value.toFixed(2) : value}`)
    })
  } else {
    console.log('❌ Benchmarks failed\n')
    benchmarkResult.details.forEach((detail) => console.log(detail))
  }

  console.log('\n🎉 Vector Search WASM Module Testing Complete')
}
