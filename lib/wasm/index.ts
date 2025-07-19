/**
 * WASM Services Exports
 *
 * Central export point for all WASM services and utilities
 */

// Core services
export { wasmServices, type WASMServicesConfig, type WASMServicesStats } from './services'
export { wasmDetector, type WASMCapabilities, type WASMOptimizationConfig } from './detection'

// Individual services
export {
  VectorSearchWASM,
  vectorSearchManager,
  type VectorDocument,
  type VectorSearchConfig,
  type VectorSearchResult,
  type VectorSearchOptions,
  createVectorSearchEngine,
  getVectorSearchEngine,
  createOptimizedEmbedding,
  calculateFastSimilarity,
} from './vector-search'

export {
  SQLiteWASMUtils,
  sqliteWASMUtils,
  type SQLiteWASMConfig,
  type QueryResult,
  type QueryPlan,
  type IndexAnalysis,
  createSQLiteWASMUtils,
} from './sqlite-utils'

export {
  ComputeWASM,
  computeManager,
  type ComputeWASMConfig,
  type ComputeTask,
  type ComputeResult,
  type AnalyticsData,
  type StatisticalSummary,
  createComputeEngine,
  getComputeEngine,
} from './compute'

export {
  WASMDataProcessor,
  dataProcessor,
  type DataProcessingConfig,
  type ProcessingTask,
  type ProcessingResult,
  type DataTransformOptions,
  type AggregationOptions,
  createDataProcessor,
} from './data-processor'

// Module loader
export {
  WASMModuleLoader,
  moduleLoader,
  type WASMModuleConfig,
  type LoadedModule,
  type ModuleLoadProgress,
  loadWASMModule,
  preloadWASMModules,
  getWASMExports,
} from './module-loader'

// Performance and observability
export {
  WASMPerformanceTracker,
  wasmPerformanceTracker,
  type WASMPerformanceMetrics,
  type WASMOperationMetrics,
} from './performance-tracker'

export {
  WASMObservabilityIntegration,
  wasmObservability,
  type WASMObservabilityConfig,
  type WASMHealthStatus,
} from './observability-integration'

// Utility functions
export {
  detectWASMCapabilities,
  getWASMOptimizationConfig,
  shouldUseWASMOptimization,
} from './detection'

// Initialize WASM services helper
export async function initializeWASMServices(config?: WASMServicesConfig) {
  return wasmServices.initialize(config)
}

// Check if WASM is available and optimized
export async function isWASMOptimized(): Promise<boolean> {
  const capabilities = await wasmDetector.detectCapabilities()
  return capabilities.isSupported && capabilities.performance !== 'low'
}

// Get comprehensive WASM status
export async function getWASMStatus() {
  const capabilities = await wasmDetector.detectCapabilities()
  const stats = wasmServices.getStats()
  const health = await wasmObservability.getHealthStatus()

  return {
    capabilities,
    stats,
    health,
    initialized: wasmServices.isReady(),
  }
}

// Export types
export type * from './services'
export type * from './detection'
export type * from './vector-search'
export type * from './sqlite-utils'
export type * from './compute'
export type * from './data-processor'
export type * from './module-loader'
export type * from './performance-tracker'
export type * from './observability-integration'
