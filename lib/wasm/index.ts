/**
 * WASM Services Exports
 *
 * Central export point for all WASM services and utilities
 */

export {
	type AnalyticsData,
	type ComputeResult,
	type ComputeTask,
import {
	type StatisticalSummary
} from "./compute";
export {
	type AggregationOptions,
	createDataProcessor,
	type DataProcessingConfig,
	type DataTransformOptions,
	import { dataProcessor,
	type ProcessingResult,
	import { type ProcessingTask,
import { WASMDataProcessor } from "./data-processor";
// Utility functions
export {
	detectWASMCapabilities,
	getWASMOptimizationConfig,
	shouldUseWASMOptimization,
	type WASMCapabilities,
	type WASMOptimizationConfig,
	wasmDetector
} from "./detection";
// Module loader
export {
	getWASMExports,
	type LoadedModule,
	import { loadWASMModule,
	type ModuleLoadProgress,
	import { moduleLoader,
	import { preloadWASMModules,
	import { type WASMModuleConfig,
import { WASMObservabilityIntegration,
	wasmObservability } from "./observability-integration";
// Performance and observability
export {
	type WASMOperationMetrics,
	type WASMPerformanceMetrics,
import { WASMPerformanceTracker,
	wasmPerformanceTracker } from "./performance-tracker";
// Core services
export {
	type WASMServicesConfig,
	type WASMServicesStats,
	import { wasmServices
} from "./services";
export {
	import { createSQLiteWASMUtils,
	type IndexAnalysis,
	type QueryPlan,
	type QueryResult,
	type SQLiteWASMConfig,
import { SQLiteWASMUtils,
	sqliteWASMUtils } from "./sqlite-utils";
// Individual services
export {
	calculateFastSimilarity,
	createOptimizedEmbedding,
	createVectorSearchEngine,
	import { getVectorSearchEngine,
	type VectorDocument,
	type VectorSearchConfig,
	type VectorSearchOptions,
	type VectorSearchResult,
import { VectorSearchWASM,
	vectorSearchManager } from "./vector-search";

// Initialize WASM services helper
export async function initializeWASMServices(config?: WASMServicesConfig) {
	return wasmServices.initialize(config);
}

// Check if WASM is available and optimized
export async function isWASMOptimized(): Promise<boolean> {
	const capabilities = await wasmDetector.detectCapabilities();
	return capabilities.isSupported && capabilities.performance !== "low";
}

// Get comprehensive WASM status
export async function getWASMStatus() {
	const capabilities = await wasmDetector.detectCapabilities();
	const stats = wasmServices.getStats();
	const health = await wasmObservability.getHealthStatus();

	return {
		capabilities,
		stats,
		health,
		initialized: wasmServices.isReady(),
	};
}

export type * from "./compute";
export type * from "./data-processor";
export type * from "./detection";
export type * from "./module-loader";
export type * from "./observability-integration";
export type * from "./performance-tracker";
// Export types
export type * from "./services";
export type * from "./sqlite-utils";
export type * from "./vector-search";
