/**
 * WASM Services Integration
 *
 * This module provides a unified interface for all WASM-optimized services
 * including vector search, SQLite utilities, and compute operations.
 */

import { ComputeWASM, type ComputeWASMConfig, computeManager } from "./compute";
import { type DataProcessingConfig, dataProcessor } from "./data-processor";
import { type WASMCapabilities, wasmDetector } from "./detection";
import { moduleLoader } from "./module-loader";
import { wasmObservability } from "./observability-integration";
import { wasmPerformanceTracker } from "./performance-tracker";
import { type SQLiteWASMConfig, SQLiteWASMUtils, sqliteWASMUtils } from "./sqlite-utils";
import { type VectorSearchConfig, VectorSearchWASM, vectorSearchManager } from "./vector-search";

export interface WASMServicesConfig {
	vectorSearch?: Partial<VectorSearchConfig>;
	sqlite?: Partial<SQLiteWASMConfig>;
	compute?: Partial<ComputeWASMConfig>;
	dataProcessing?: Partial<DataProcessingConfig>;
	autoInitialize?: boolean;
	enableFallbacks?: boolean;
	enableObservability?: boolean;
}

export interface WASMServicesStats {
	capabilities: WASMCapabilities;
	vectorSearch: any;
	sqlite: any;
	compute: any;
	dataProcessing: any;
	performance: any;
	observability: any;
	initializationTime: number;
	isFullyInitialized: boolean;
}

/**
 * WASM Services Manager
 *
 * Provides a unified interface for all WASM-optimized services
 */
export class WASMServices {
	private static instance: WASMServices;
	private isInitialized = false;
	private initializationTime = 0;
	private config: WASMServicesConfig;
	private capabilities: WASMCapabilities | null = null;

	// Service instances
	private vectorSearchEngine: VectorSearchWASM | null = null;
	private sqliteUtils: SQLiteWASMUtils | null = null;
	private computeEngine: ComputeWASM | null = null;

	constructor(config: WASMServicesConfig = {}) {
		this.config = {
			autoInitialize: true,
			enableFallbacks: true,
			enableObservability: true,
			...config,
		};
	}

	static getInstance(config?: WASMServicesConfig): WASMServices {
		if (!WASMServices.instance) {
			WASMServices.instance = new WASMServices(config);
		}
		return WASMServices.instance;
	}

	/**
	 * Initialize all WASM services
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		const startTime = performance.now();
		console.log("🚀 Initializing WASM Services...");

		try {
			// Detect WASM capabilities first
			this.capabilities = await wasmDetector.detectCapabilities();
			console.log(
				"✅ WASM capabilities detected:",
				this.capabilities.isSupported ? "Supported" : "Not supported"
			);

			// Initialize services in parallel
			const initPromises: Promise<void>[] = [];

			// Vector Search Service
			if (this.capabilities.isSupported && this.capabilities.hasSIMD) {
				initPromises.push(this.initializeVectorSearch());
			} else {
				console.log("⚠️ Vector search WASM disabled (SIMD not available)");
			}

			// SQLite WASM Utils
			if (this.capabilities.isSupported) {
				initPromises.push(this.initializeSQLiteUtils());
			} else {
				console.log("⚠️ SQLite WASM disabled (WASM not supported)");
			}

			// Compute Engine
			if (this.capabilities.isSupported && this.capabilities.hasThreads) {
				initPromises.push(this.initializeComputeEngine());
			} else {
				console.log("⚠️ Compute WASM disabled (threads not available)");
			}

			// Data Processing Service
			if (this.capabilities.isSupported) {
				initPromises.push(this.initializeDataProcessor());
			}

			// Observability Integration
			if (this.config.enableObservability) {
				initPromises.push(this.initializeObservability());
			}

			// Wait for all services to initialize
			await Promise.all(initPromises);

			this.initializationTime = performance.now() - startTime;
			this.isInitialized = true;

			console.log(`✅ WASM Services initialized in ${this.initializationTime.toFixed(2)}ms`);

			if (process.env.NODE_ENV === "development") {
				this.logServicesStatus();
			}
		} catch (error) {
			console.error("❌ WASM Services initialization failed:", error);

			if (this.config.enableFallbacks) {
				console.log("🔄 Falling back to JavaScript implementations");
				await this.initializeFallbacks();
			} else {
				throw error;
			}
		}
	}

	/**
	 * Initialize Vector Search service
	 */
	private async initializeVectorSearch(): Promise<void> {
		try {
			this.vectorSearchEngine = vectorSearchManager.getSearchEngine(
				"default",
				this.config.vectorSearch
			);
			await this.vectorSearchEngine.initialize();
			console.log("✅ Vector Search WASM initialized");
		} catch (error) {
			console.warn("⚠️ Vector Search WASM initialization failed:", error);
			if (this.config.enableFallbacks) {
				this.vectorSearchEngine = new VectorSearchWASM(this.config.vectorSearch);
				await this.vectorSearchEngine.initialize();
			}
		}
	}

	/**
	 * Initialize SQLite WASM utilities
	 */
	private async initializeSQLiteUtils(): Promise<void> {
		try {
			this.sqliteUtils = sqliteWASMUtils;
			await this.sqliteUtils.initialize();
			console.log("✅ SQLite WASM utilities initialized");
		} catch (error) {
			console.warn("⚠️ SQLite WASM initialization failed:", error);
			if (this.config.enableFallbacks) {
				this.sqliteUtils = new SQLiteWASMUtils(this.config.sqlite);
				await this.sqliteUtils.initialize();
			}
		}
	}

	/**
	 * Initialize Compute engine
	 */
	private async initializeComputeEngine(): Promise<void> {
		try {
			this.computeEngine = computeManager.getComputeEngine(this.config.compute);
			await this.computeEngine.initialize();
			console.log("✅ Compute WASM engine initialized");
		} catch (error) {
			console.warn("⚠️ Compute WASM initialization failed:", error);
			if (this.config.enableFallbacks) {
				this.computeEngine = new ComputeWASM(this.config.compute);
				await this.computeEngine.initialize();
			}
		}
	}

	/**
	 * Initialize Data Processing service
	 */
	private async initializeDataProcessor(): Promise<void> {
		try {
			await dataProcessor.initialize();
			console.log("✅ Data Processing WASM initialized");
		} catch (error) {
			console.warn("⚠️ Data Processing WASM initialization failed:", error);
			if (this.config.enableFallbacks) {
				// Data processor has built-in fallbacks
			}
		}
	}

	/**
	 * Initialize Observability Integration
	 */
	private async initializeObservability(): Promise<void> {
		try {
			// Set the WASMServices instance to avoid circular dependency
			wasmObservability.setWASMServices(this);
			await wasmObservability.initialize();
			console.log("✅ WASM Observability Integration initialized");
		} catch (error) {
			console.warn("⚠️ WASM Observability initialization failed:", error);
		}
	}

	/**
	 * Initialize fallback implementations
	 */
	private async initializeFallbacks(): Promise<void> {
		console.log("🔄 Initializing JavaScript fallbacks...");

		// Initialize services with JavaScript fallbacks
		if (!this.vectorSearchEngine) {
			this.vectorSearchEngine = new VectorSearchWASM(this.config.vectorSearch);
			await this.vectorSearchEngine.initialize();
		}

		if (!this.sqliteUtils) {
			this.sqliteUtils = new SQLiteWASMUtils(this.config.sqlite);
			await this.sqliteUtils.initialize();
		}

		if (!this.computeEngine) {
			this.computeEngine = new ComputeWASM(this.config.compute);
			await this.computeEngine.initialize();
		}

		// Data processor has built-in fallbacks
		if (!dataProcessor["isInitialized"]) {
			await dataProcessor.initialize();
		}

		this.isInitialized = true;
		console.log("✅ JavaScript fallbacks initialized");
	}

	/**
	 * Get Vector Search service
	 */
	getVectorSearch(): VectorSearchWASM {
		if (!this.vectorSearchEngine) {
			throw new Error("Vector Search service not initialized. Call initialize() first.");
		}
		return this.vectorSearchEngine;
	}

	/**
	 * Get SQLite WASM utilities
	 */
	getSQLiteUtils(): SQLiteWASMUtils {
		if (!this.sqliteUtils) {
			throw new Error("SQLite WASM utilities not initialized. Call initialize() first.");
		}
		return this.sqliteUtils;
	}

	/**
	 * Get Compute engine
	 */
	getComputeEngine(): ComputeWASM {
		if (!this.computeEngine) {
			throw new Error("Compute engine not initialized. Call initialize() first.");
		}
		return this.computeEngine;
	}

	/**
	 * Get Data Processor
	 */
	getDataProcessor() {
		return dataProcessor;
	}

	/**
	 * Get Module Loader
	 */
	getModuleLoader() {
		return moduleLoader;
	}

	/**
	 * Get Performance Tracker
	 */
	getPerformanceTracker() {
		return wasmPerformanceTracker;
	}

	/**
	 * Get Observability Integration
	 */
	getObservability() {
		return wasmObservability;
	}

	/**
	 * Check if services are ready
	 */
	isReady(): boolean {
		return this.isInitialized;
	}

	/**
	 * Get comprehensive statistics
	 */
	getStats(): WASMServicesStats {
		return {
			capabilities: this.capabilities || {
				isSupported: false,
				hasThreads: false,
				hasSIMD: false,
				hasExceptionHandling: false,
				hasBulkMemory: false,
				hasReferenceTypes: false,
				performance: "unknown",
			},
			vectorSearch: this.vectorSearchEngine?.getStats() || null,
			sqlite: this.sqliteUtils?.getStats() || null,
			compute: this.computeEngine?.getStats() || null,
			dataProcessing: dataProcessor.getStats() || null,
			performance: wasmPerformanceTracker.getMetrics() || null,
			observability: this.config.enableObservability ? wasmObservability.getHealthStatus() : null,
			initializationTime: this.initializationTime,
			isFullyInitialized: this.isInitialized,
		};
	}

	/**
	 * Log services status for debugging
	 */
	private logServicesStatus(): void {
		const stats = this.getStats();

		console.group("🔧 WASM Services Status");
		console.log("Capabilities:", stats.capabilities);
		console.log("Vector Search:", stats.vectorSearch ? "✅ Ready" : "❌ Not available");
		console.log("SQLite Utils:", stats.sqlite ? "✅ Ready" : "❌ Not available");
		console.log("Compute Engine:", stats.compute ? "✅ Ready" : "❌ Not available");
		console.log("Initialization Time:", `${stats.initializationTime.toFixed(2)}ms`);
		console.groupEnd();
	}

	/**
	 * Perform health check on all services
	 */
	async healthCheck(): Promise<{
		overall: "healthy" | "degraded" | "unhealthy";
		services: {
			vectorSearch: "healthy" | "unhealthy" | "unavailable";
			sqlite: "healthy" | "unhealthy" | "unavailable";
			compute: "healthy" | "unhealthy" | "unavailable";
		};
		details: string[];
	}> {
		const details: string[] = [];
		const services = {
			vectorSearch: "unavailable" as const,
			sqlite: "unavailable" as const,
			compute: "unavailable" as const,
		};

		// Check Vector Search
		if (this.vectorSearchEngine) {
			try {
				const stats = this.vectorSearchEngine.getStats();
				services.vectorSearch = stats.isWASMEnabled ? "healthy" : "unhealthy";
				details.push(`Vector Search: ${stats.documentsCount} documents indexed`);
			} catch (error) {
				services.vectorSearch = "unhealthy";
				details.push(`Vector Search error: ${error}`);
			}
		}

		// Check SQLite Utils
		if (this.sqliteUtils) {
			try {
				const stats = this.sqliteUtils.getStats();
				services.sqlite = stats.isWASMEnabled ? "healthy" : "unhealthy";
				details.push(`SQLite Utils: ${stats.cacheSize} cached queries`);
			} catch (error) {
				services.sqlite = "unhealthy";
				details.push(`SQLite Utils error: ${error}`);
			}
		}

		// Check Compute Engine
		if (this.computeEngine) {
			try {
				const stats = this.computeEngine.getStats();
				services.compute = stats.isWASMEnabled ? "healthy" : "unhealthy";
				details.push(`Compute Engine: ${stats.workersCount} workers`);
			} catch (error) {
				services.compute = "unhealthy";
				details.push(`Compute Engine error: ${error}`);
			}
		}

		// Determine overall health
		const healthyCount = Object.values(services).filter((status) => status === "healthy").length;
		const unhealthyCount = Object.values(services).filter(
			(status) => status === "unhealthy"
		).length;

		let overall: "healthy" | "degraded" | "unhealthy";
		if (unhealthyCount > 0) {
			overall = "unhealthy";
		} else if (healthyCount < 2) {
			overall = "degraded";
		} else {
			overall = "healthy";
		}

		return { overall, services, details };
	}

	/**
	 * Cleanup all services
	 */
	cleanup(): void {
		console.log("🧹 Cleaning up WASM Services...");

		try {
			this.vectorSearchEngine?.clear();
			this.sqliteUtils?.clear();
			this.computeEngine?.cleanup();
			dataProcessor.cleanup();
			moduleLoader.clearCache();
			wasmPerformanceTracker.reset();
			wasmObservability.cleanup();

			this.isInitialized = false;
			console.log("✅ WASM Services cleanup completed");
		} catch (error) {
			console.error("❌ WASM Services cleanup failed:", error);
		}
	}
}

// Export singleton instance
export const wasmServices = WASMServices.getInstance();

// Utility functions
export const initializeWASMServices = async (config?: WASMServicesConfig) => {
	const services = WASMServices.getInstance(config);
	await services.initialize();
	return services;
};

export const getWASMServices = () => wasmServices;

// Auto-initialize if configured
if (typeof window !== "undefined" && wasmServices["config"].autoInitialize) {
	wasmServices.initialize().catch((error) => {
		console.warn("Auto-initialization of WASM services failed:", error);
	});
}
