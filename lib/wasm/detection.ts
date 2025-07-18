/**
 * WASM Detection and Progressive Enhancement Utilities
 *
 * This module provides utilities for detecting WASM capabilities and
 * progressively enhancing the application with WASM-optimized features.
 */

export interface WASMCapabilities {
  isSupported: boolean
  hasThreads: boolean
  hasSIMD: boolean
  hasExceptionHandling: boolean
  hasBulkMemory: boolean
  hasReferenceTypes: boolean
  performance: 'high' | 'medium' | 'low' | 'unknown'
}

export interface WASMOptimizationConfig {
  enableVectorSearch: boolean
  enableSQLiteOptimizations: boolean
  enableComputeOptimizations: boolean
  fallbackToJS: boolean
  performanceThreshold: number
}

/**
 * Detect WASM capabilities and performance characteristics
 */
export class WASMDetector {
  private static instance: WASMDetector
  private capabilities: WASMCapabilities | null = null
  private performanceBenchmark: number | null = null

  static getInstance(): WASMDetector {
    if (!WASMDetector.instance) {
      WASMDetector.instance = new WASMDetector()
    }
    return WASMDetector.instance
  }

  /**
   * Detect WASM capabilities
   */
  async detectCapabilities(): Promise<WASMCapabilities> {
    if (this.capabilities) {
      return this.capabilities
    }

    const capabilities: WASMCapabilities = {
      isSupported: false,
      hasThreads: false,
      hasSIMD: false,
      hasExceptionHandling: false,
      hasBulkMemory: false,
      hasReferenceTypes: false,
      performance: 'unknown',
    }

    try {
      // Basic WASM support check
      if (typeof WebAssembly === 'undefined') {
        this.capabilities = capabilities
        return capabilities
      }

      capabilities.isSupported = true

      // Check for specific WASM features
      await this.checkWASMFeatures(capabilities)

      // Benchmark WASM performance
      capabilities.performance = await this.benchmarkPerformance()

      this.capabilities = capabilities
      return capabilities
    } catch (error) {
      console.warn('WASM capability detection failed:', error)
      this.capabilities = capabilities
      return capabilities
    }
  }

  /**
   * Check for specific WASM features
   */
  private async checkWASMFeatures(capabilities: WASMCapabilities): Promise<void> {
    try {
      // Check for threads support
      capabilities.hasThreads =
        typeof SharedArrayBuffer !== 'undefined' && typeof Worker !== 'undefined'

      // Check for SIMD support
      try {
        const simdModule = await WebAssembly.compile(
          new Uint8Array([
            0x00,
            0x61,
            0x73,
            0x6d,
            0x01,
            0x00,
            0x00,
            0x00, // WASM header
            0x01,
            0x05,
            0x01,
            0x60,
            0x00,
            0x01,
            0x7b, // Type section (v128)
          ])
        )
        capabilities.hasSIMD = true
      } catch {
        capabilities.hasSIMD = false
      }

      // Check for exception handling
      try {
        await WebAssembly.compile(
          new Uint8Array([
            0x00,
            0x61,
            0x73,
            0x6d,
            0x01,
            0x00,
            0x00,
            0x00, // WASM header
            0x01,
            0x04,
            0x01,
            0x60,
            0x00,
            0x00, // Type section
            0x03,
            0x02,
            0x01,
            0x00, // Function section
            0x0a,
            0x05,
            0x01,
            0x03,
            0x00,
            0x06,
            0x0b, // Code section with try
          ])
        )
        capabilities.hasExceptionHandling = true
      } catch {
        capabilities.hasExceptionHandling = false
      }

      // Check for bulk memory operations
      try {
        await WebAssembly.compile(
          new Uint8Array([
            0x00,
            0x61,
            0x73,
            0x6d,
            0x01,
            0x00,
            0x00,
            0x00, // WASM header
            0x01,
            0x04,
            0x01,
            0x60,
            0x00,
            0x00, // Type section
            0x03,
            0x02,
            0x01,
            0x00, // Function section
            0x0a,
            0x07,
            0x01,
            0x05,
            0x00,
            0xfc,
            0x08,
            0x00,
            0x00,
            0x0b, // memory.fill
          ])
        )
        capabilities.hasBulkMemory = true
      } catch {
        capabilities.hasBulkMemory = false
      }

      // Check for reference types
      try {
        await WebAssembly.compile(
          new Uint8Array([
            0x00,
            0x61,
            0x73,
            0x6d,
            0x01,
            0x00,
            0x00,
            0x00, // WASM header
            0x01,
            0x05,
            0x01,
            0x60,
            0x00,
            0x01,
            0x6f, // Type section (externref)
          ])
        )
        capabilities.hasReferenceTypes = true
      } catch {
        capabilities.hasReferenceTypes = false
      }
    } catch (error) {
      console.warn('WASM feature detection failed:', error)
    }
  }

  /**
   * Benchmark WASM performance
   */
  private async benchmarkPerformance(): Promise<'high' | 'medium' | 'low' | 'unknown'> {
    if (this.performanceBenchmark !== null) {
      return this.categorizePerformance(this.performanceBenchmark)
    }

    try {
      // Simple WASM module for benchmarking
      const wasmModule = await WebAssembly.compile(
        new Uint8Array([
          0x00,
          0x61,
          0x73,
          0x6d,
          0x01,
          0x00,
          0x00,
          0x00, // WASM header
          0x01,
          0x07,
          0x01,
          0x60,
          0x02,
          0x7f,
          0x7f,
          0x01,
          0x7f, // Type: (i32, i32) -> i32
          0x03,
          0x02,
          0x01,
          0x00, // Function section
          0x07,
          0x07,
          0x01,
          0x03,
          0x61,
          0x64,
          0x64,
          0x00,
          0x00, // Export "add"
          0x0a,
          0x09,
          0x01,
          0x07,
          0x00,
          0x20,
          0x00,
          0x20,
          0x01,
          0x6a,
          0x0b, // add function
        ])
      )

      const wasmInstance = await WebAssembly.instantiate(wasmModule)
      const addFunction = wasmInstance.exports.add as (a: number, b: number) => number

      // Benchmark: perform 1M additions
      const iterations = 1000000
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        addFunction(i, i + 1)
      }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      this.performanceBenchmark = executionTime
      return this.categorizePerformance(executionTime)
    } catch (error) {
      console.warn('WASM performance benchmark failed:', error)
      return 'unknown'
    }
  }

  /**
   * Categorize performance based on benchmark results
   */
  private categorizePerformance(executionTime: number): 'high' | 'medium' | 'low' | 'unknown' {
    if (executionTime < 10) return 'high'
    if (executionTime < 50) return 'medium'
    if (executionTime < 200) return 'low'
    return 'unknown'
  }

  /**
   * Get optimization configuration based on capabilities
   */
  getOptimizationConfig(): WASMOptimizationConfig {
    if (!this.capabilities) {
      return {
        enableVectorSearch: false,
        enableSQLiteOptimizations: false,
        enableComputeOptimizations: false,
        fallbackToJS: true,
        performanceThreshold: 0,
      }
    }

    const { isSupported, performance, hasSIMD, hasThreads } = this.capabilities

    return {
      enableVectorSearch:
        isSupported && (performance === 'high' || performance === 'medium') && hasSIMD,
      enableSQLiteOptimizations:
        isSupported && (performance === 'high' || performance === 'medium'),
      enableComputeOptimizations: isSupported && performance === 'high' && hasThreads,
      fallbackToJS: !isSupported || performance === 'low' || performance === 'unknown',
      performanceThreshold: this.performanceBenchmark || 0,
    }
  }

  /**
   * Check if a specific optimization should be enabled
   */
  shouldUseOptimization(type: 'vector' | 'sqlite' | 'compute'): boolean {
    const config = this.getOptimizationConfig()

    switch (type) {
      case 'vector':
        return config.enableVectorSearch
      case 'sqlite':
        return config.enableSQLiteOptimizations
      case 'compute':
        return config.enableComputeOptimizations
      default:
        return false
    }
  }

  /**
   * Get capabilities summary for debugging
   */
  getCapabilitiesSummary(): string {
    if (!this.capabilities) {
      return 'WASM capabilities not detected yet'
    }

    const { isSupported, performance, hasThreads, hasSIMD } = this.capabilities
    const config = this.getOptimizationConfig()

    return `WASM Support: ${isSupported ? 'Yes' : 'No'}
Performance: ${performance}
Threads: ${hasThreads ? 'Yes' : 'No'}
SIMD: ${hasSIMD ? 'Yes' : 'No'}
Vector Search: ${config.enableVectorSearch ? 'Enabled' : 'Disabled'}
SQLite Optimizations: ${config.enableSQLiteOptimizations ? 'Enabled' : 'Disabled'}
Compute Optimizations: ${config.enableComputeOptimizations ? 'Enabled' : 'Disabled'}`
  }
}

// Export singleton instance
export const wasmDetector = WASMDetector.getInstance()

// Utility functions
export const detectWASMCapabilities = () => wasmDetector.detectCapabilities()
export const getWASMOptimizationConfig = () => wasmDetector.getOptimizationConfig()
export const shouldUseWASMOptimization = (type: 'vector' | 'sqlite' | 'compute') =>
  wasmDetector.shouldUseOptimization(type)
