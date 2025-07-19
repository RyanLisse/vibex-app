/**
 * Vector Search WASM Module Loader
 *
 * Handles loading and initialization of the compiled Rust WASM module
 * with proper error handling and fallback support.
 */

import type { VectorSearch as WASMVectorSearch } from '../generated/vector-search/vector_search_wasm'

export interface VectorSearchModule {
  VectorSearch: typeof WASMVectorSearch
  VectorBenchmark: any
  MemoryUtils: any
  memory: WebAssembly.Memory
}

let wasmModule: VectorSearchModule | null = null
let loadingPromise: Promise<VectorSearchModule> | null = null

/**
 * Load the Vector Search WASM module
 */
export async function loadVectorSearchWASM(): Promise<VectorSearchModule> {
  // Return existing module if already loaded
  if (wasmModule) {
    return wasmModule
  }

  // Return existing loading promise if already loading
  if (loadingPromise) {
    return loadingPromise
  }

  // Start loading
  loadingPromise = loadModule()

  try {
    wasmModule = await loadingPromise
    return wasmModule
  } finally {
    loadingPromise = null
  }
}

/**
 * Internal module loading logic
 */
async function loadModule(): Promise<VectorSearchModule> {
  try {
    // Dynamic import of generated WASM module
    const module = await import('../generated/vector-search/vector_search_wasm')

    // Initialize the WASM module
    await module.default()

    return {
      VectorSearch: module.VectorSearch,
      VectorBenchmark: module.VectorBenchmark,
      MemoryUtils: module.MemoryUtils,
      memory: module.memory,
    }
  } catch (error) {
    console.warn('WASM module not available, using fallback:', error)

    // Return mock implementation for development
    return {
      VectorSearch: class MockVectorSearch {
        constructor(_dimensions: number) {}
        free() {}
        findTopK(_query: Float64Array, _docs: Float64Array, _count: number, _k: number): number[] {
          return []
        }
      } as any,
      VectorBenchmark: class MockVectorBenchmark {
        benchmarkOperations(_dims: number, _iters: number): string {
          return 'mock'
        }
        benchmarkSIMD(_dims: number, _iters: number): string {
          return 'mock'
        }
      } as any,
      MemoryUtils: {
        getMemorySize: () => 0,
      } as any,
      memory: {
        buffer: new ArrayBuffer(0),
      } as any,
    }
  }
}

/**
 * Create a new Vector Search instance
 */
export async function createVectorSearchInstance(dimensions: number): Promise<WASMVectorSearch> {
  const module = await loadVectorSearchWASM()
  return new module.VectorSearch(dimensions)
}

/**
 * Run performance benchmarks
 */
export async function runVectorBenchmarks(
  dimensions: number,
  iterations: number
): Promise<{
  standard: string
  simd: string
}> {
  const module = await loadVectorSearchWASM()
  const benchmark = new module.VectorBenchmark()

  return {
    standard: benchmark.benchmarkOperations(dimensions, iterations),
    simd: benchmark.benchmarkSIMD(dimensions, iterations),
  }
}

/**
 * Check if WASM module is loaded
 */
export function isVectorSearchWASMLoaded(): boolean {
  return wasmModule !== null
}

/**
 * Unload the WASM module (for testing/cleanup)
 */
export function unloadVectorSearchWASM(): void {
  wasmModule = null
  loadingPromise = null
}

/**
 * Get memory statistics
 */
export async function getMemoryStats(): Promise<{
  bufferSize: number
  pageSize: number
  pages: number
}> {
  const module = await loadVectorSearchWASM()
  const memorySize = module.MemoryUtils.getMemorySize()
  const pageSize = 65536 // 64KB per page

  return {
    bufferSize: memorySize,
    pageSize,
    pages: Math.ceil(memorySize / pageSize),
  }
}

/**
 * Optimized batch similarity search using WASM
 */
export async function batchSimilaritySearch(
  queryVector: Float64Array,
  documentVectors: Float64Array,
  dimensions: number,
  topK: number
): Promise<number[]> {
  const module = await loadVectorSearchWASM()
  const search = new module.VectorSearch(dimensions)

  const documentCount = documentVectors.length / dimensions

  // Find top K indices
  const topIndices = search.findTopK(queryVector, documentVectors, documentCount, topK)

  // Clean up
  search.free()

  return topIndices
}

/**
 * Direct memory operations for advanced users
 */
export const MemoryOperations = {
  /**
   * Allocate memory for vectors
   */
  async allocate(size: number): Promise<number> {
    const module = await loadVectorSearchWASM()
    return module.MemoryUtils.allocateFloat64Array(size)
  },

  /**
   * Free allocated memory
   */
  async free(ptr: number, size: number): Promise<void> {
    const module = await loadVectorSearchWASM()
    module.MemoryUtils.freeFloat64Array(ptr, size)
  },

  /**
   * Copy data to WASM memory
   */
  async copyToWASM(data: Float64Array, ptr: number): Promise<void> {
    const module = await loadVectorSearchWASM()
    const memory = new Float64Array(module.memory.buffer, ptr, data.length)
    memory.set(data)
  },

  /**
   * Copy data from WASM memory
   */
  async copyFromWASM(ptr: number, length: number): Promise<Float64Array> {
    const module = await loadVectorSearchWASM()
    const memory = new Float64Array(module.memory.buffer, ptr, length)
    return new Float64Array(memory)
  },
}
