/**
 * WASM Detection and Progressive Enhancement Utilities
 *
 * This module provides utilities for detecting WASM capabilities and
 * progressively enhancing the application with WASM-optimized features.
 */

import { observability } from "../observability";

export interface WASMCapabilities {
	isSupported: boolean;
	hasThreads: boolean;
	hasSIMD: boolean;
	hasExceptionHandling: boolean;
	hasBulkMemory: boolean;
	hasReferenceTypes: boolean;
	hasMultiValue: boolean;
	hasSignExtension: boolean;
	hasNonTrappingFloatToInt: boolean;
	performance: "high" | "medium" | "low" | "unknown";
	memoryInfo: {
		available: number;
		limit: number;
		usage: number;
	};
	browserInfo: {
		name: string;
		version: string;
		engine: string;
	};
}

export interface WASMOptimizationConfig {
	enableVectorSearch: boolean;
	enableSQLiteOptimizations: boolean;
	enableComputeOptimizations: boolean;
	enableDataProcessing: boolean;
	fallbackToJS: boolean;
	performanceThreshold: number;
	memoryThreshold: number;
	adaptiveOptimization: boolean;
}

/**
 * Detect WASM capabilities and performance characteristics
 */
export class WASMDetector {
	private static instance: WASMDetector;
	private capabilities: WASMCapabilities | null = null;
	private performanceBenchmark: number | null = null;

	static getInstance(): WASMDetector {
		if (!WASMDetector.instance) {
			WASMDetector.instance = new WASMDetector();
		}
		return WASMDetector.instance;
	}

	/**
	 * Detect WASM capabilities with comprehensive feature detection
	 */
	async detectCapabilities(): Promise<WASMCapabilities> {
		if (this.capabilities) {
			return this.capabilities;
		}

		return observability.trackOperation("wasm.detect-capabilities", async () => {
			const capabilities: WASMCapabilities = {
				isSupported: false,
				hasThreads: false,
				hasSIMD: false,
				hasExceptionHandling: false,
				hasBulkMemory: false,
				hasReferenceTypes: false,
				hasMultiValue: false,
				hasSignExtension: false,
				hasNonTrappingFloatToInt: false,
				performance: "unknown",
				memoryInfo: {
					available: 0,
					limit: 0,
					usage: 0,
				},
				browserInfo: {
					name: "unknown",
					version: "unknown",
					engine: "unknown",
				},
			};

			try {
				// Basic WASM support check
				if (typeof WebAssembly === "undefined") {
					observability.recordEvent("wasm.detection.no-support", {
						reason: "WebAssembly not available",
					});
					this.capabilities = capabilities;
					return capabilities;
				}

				capabilities.isSupported = true;
				observability.recordEvent("wasm.detection.basic-support", {});

				// Detect browser information
				capabilities.browserInfo = this.detectBrowserInfo();

				// Get memory information
				capabilities.memoryInfo = this.getMemoryInfo();

				// Check for specific WASM features
				await this.checkWASMFeatures(capabilities);

				// Benchmark WASM performance
				capabilities.performance = await this.benchmarkPerformance();

				// Log comprehensive capabilities
				observability.recordEvent("wasm.detection.complete", {
					capabilities,
					detectionTime: Date.now(),
				});

				this.capabilities = capabilities;
				return capabilities;
			} catch (error) {
				observability.recordError("wasm.detection.failed", error as Error);
				console.warn("WASM capability detection failed:", error);
				this.capabilities = capabilities;
				return capabilities;
			}
		});
	}

	/**
	 * Check for specific WASM features with comprehensive testing
	 */
	private async checkWASMFeatures(capabilities: WASMCapabilities): Promise<void> {
		return observability.trackOperation("wasm.check-features", async () => {
			try {
				// Check for threads support (SharedArrayBuffer + Worker + cross-origin isolation)
				capabilities.hasThreads =
					typeof SharedArrayBuffer !== "undefined" &&
					typeof Worker !== "undefined" &&
					(typeof crossOriginIsolated === "undefined" || crossOriginIsolated);

				observability.recordEvent("wasm.feature.threads", {
					supported: capabilities.hasThreads,
					hasSharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
					hasWorker: typeof Worker !== "undefined",
					isCrossOriginIsolated:
						typeof crossOriginIsolated !== "undefined" ? crossOriginIsolated : "unknown",
				});

				// Check for SIMD support (128-bit vectors)
				capabilities.hasSIMD = await this.testWASMFeature("simd", [
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
				]);

				// Check for exception handling
				capabilities.hasExceptionHandling = await this.testWASMFeature("exception-handling", [
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
				]);

				// Check for bulk memory operations
				capabilities.hasBulkMemory = await this.testWASMFeature("bulk-memory", [
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
				]);

				// Check for reference types
				capabilities.hasReferenceTypes = await this.testWASMFeature("reference-types", [
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
				]);

				// Check for multi-value returns
				capabilities.hasMultiValue = await this.testWASMFeature("multi-value", [
					0x00,
					0x61,
					0x73,
					0x6d,
					0x01,
					0x00,
					0x00,
					0x00, // WASM header
					0x01,
					0x06,
					0x01,
					0x60,
					0x00,
					0x02,
					0x7f,
					0x7f, // Type section (returns i32, i32)
				]);

				// Check for sign extension operations
				capabilities.hasSignExtension = await this.testWASMFeature("sign-extension", [
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
					0x06,
					0x01,
					0x04,
					0x00,
					0x41,
					0x00,
					0xc0,
					0x0b, // i32.extend8_s
				]);

				// Check for non-trapping float-to-int conversions
				capabilities.hasNonTrappingFloatToInt = await this.testWASMFeature(
					"non-trapping-float-to-int",
					[
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
						0x08,
						0x01,
						0x06,
						0x00,
						0x43,
						0x00,
						0x00,
						0x80,
						0x3f,
						0xfc,
						0x00,
						0x0b, // i32.trunc_sat_f32_s
					]
				);

				observability.recordEvent("wasm.features.detected", {
					simd: capabilities.hasSIMD,
					threads: capabilities.hasThreads,
					exceptionHandling: capabilities.hasExceptionHandling,
					bulkMemory: capabilities.hasBulkMemory,
					referenceTypes: capabilities.hasReferenceTypes,
					multiValue: capabilities.hasMultiValue,
					signExtension: capabilities.hasSignExtension,
					nonTrappingFloatToInt: capabilities.hasNonTrappingFloatToInt,
				});
			} catch (error) {
				observability.recordError("wasm.feature-detection.failed", error as Error);
				console.warn("WASM feature detection failed:", error);
			}
		});
	}

	/**
	 * Test a specific WASM feature by attempting to compile a test module
	 */
	private async testWASMFeature(featureName: string, wasmBytes: number[]): Promise<boolean> {
		try {
			await WebAssembly.compile(new Uint8Array(wasmBytes));
			observability.recordEvent(`wasm.feature.${featureName}`, {
				supported: true,
			});
			return true;
		} catch (error) {
			observability.recordEvent(`wasm.feature.${featureName}`, {
				supported: false,
				error: (error as Error).message,
			});
			return false;
		}
	}

	/**
	 * Detect browser information for optimization decisions
	 */
	private detectBrowserInfo(): WASMCapabilities["browserInfo"] {
		const userAgent = navigator.userAgent;
		let name = "unknown";
		let version = "unknown";
		let engine = "unknown";

		// Detect browser
		if (userAgent.includes("Chrome")) {
			name = "chrome";
			const match = userAgent.match(/Chrome\/(\d+)/);
			version = match ? match[1] : "unknown";
			engine = "blink";
		} else if (userAgent.includes("Firefox")) {
			name = "firefox";
			const match = userAgent.match(/Firefox\/(\d+)/);
			version = match ? match[1] : "unknown";
			engine = "gecko";
		} else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
			name = "safari";
			const match = userAgent.match(/Version\/(\d+)/);
			version = match ? match[1] : "unknown";
			engine = "webkit";
		} else if (userAgent.includes("Edge")) {
			name = "edge";
			const match = userAgent.match(/Edge\/(\d+)/);
			version = match ? match[1] : "unknown";
			engine = "blink";
		}

		return { name, version, engine };
	}

	/**
	 * Benchmark WASM performance
	 */
	private async benchmarkPerformance(): Promise<"high" | "medium" | "low" | "unknown"> {
		if (this.performanceBenchmark !== null) {
			return this.categorizePerformance(this.performanceBenchmark);
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
			);

			const wasmInstance = await WebAssembly.instantiate(wasmModule);
			const addFunction = wasmInstance.exports.add as (a: number, b: number) => number;

			// Benchmark: perform 1M additions
			const iterations = 1_000_000;
			const startTime = performance.now();

			for (let i = 0; i < iterations; i++) {
				addFunction(i, i + 1);
			}

			const endTime = performance.now();
			const executionTime = endTime - startTime;

			this.performanceBenchmark = executionTime;
			return this.categorizePerformance(executionTime);
		} catch (error) {
			console.warn("WASM performance benchmark failed:", error);
			return "unknown";
		}
	}

	/**
	 * Categorize performance based on benchmark results
	 */
	private categorizePerformance(executionTime: number): "high" | "medium" | "low" | "unknown" {
		if (executionTime < 10) return "high";
		if (executionTime < 50) return "medium";
		if (executionTime < 200) return "low";
		return "unknown";
	}

	/**
	 * Get optimization configuration based on capabilities with adaptive settings
	 */
	getOptimizationConfig(): WASMOptimizationConfig {
		if (!this.capabilities) {
			return {
				enableVectorSearch: false,
				enableSQLiteOptimizations: false,
				enableComputeOptimizations: false,
				enableDataProcessing: false,
				fallbackToJS: true,
				performanceThreshold: 0,
				memoryThreshold: 0,
				adaptiveOptimization: false,
			};
		}

		const {
			isSupported,
			performance,
			hasSIMD,
			hasThreads,
			hasBulkMemory,
			memoryInfo,
			browserInfo,
		} = this.capabilities;

		// Browser-specific optimizations
		const isChromeOrEdge = browserInfo.name === "chrome" || browserInfo.name === "edge";
		const isFirefox = browserInfo.name === "firefox";
		const isSafari = browserInfo.name === "safari";

		// Memory-based decisions
		const hasEnoughMemory = memoryInfo.available > 100 * 1024 * 1024; // 100MB
		const isLowMemory = memoryInfo.available < 50 * 1024 * 1024; // 50MB

		return {
			enableVectorSearch:
				isSupported &&
				(performance === "high" || performance === "medium") &&
				hasSIMD &&
				hasEnoughMemory &&
				(isChromeOrEdge || isFirefox), // Safari SIMD support is limited

			enableSQLiteOptimizations:
				isSupported &&
				(performance === "high" || performance === "medium") &&
				hasBulkMemory &&
				!isLowMemory,

			enableComputeOptimizations:
				isSupported && performance === "high" && hasThreads && hasEnoughMemory && isChromeOrEdge, // Best thread support

			enableDataProcessing:
				isSupported &&
				(performance === "high" || performance === "medium") &&
				hasBulkMemory &&
				hasEnoughMemory,

			fallbackToJS:
				!isSupported || performance === "low" || performance === "unknown" || isLowMemory,

			performanceThreshold: this.performanceBenchmark || 0,
			memoryThreshold: memoryInfo.available,

			adaptiveOptimization: isSupported && performance !== "unknown" && hasEnoughMemory,
		};
	}

	/**
	 * Check if a specific optimization should be enabled with runtime adaptation
	 */
	shouldUseOptimization(type: "vector" | "sqlite" | "compute" | "data-processing"): boolean {
		const config = this.getOptimizationConfig();

		// Runtime memory check for adaptive optimization
		if (config.adaptiveOptimization) {
			const currentMemory = this.getMemoryInfo();
			if (currentMemory.usage > currentMemory.limit * 0.8) {
				observability.recordEvent("wasm.optimization.memory-pressure", {
					type,
					memoryUsage: currentMemory.usage,
					memoryLimit: currentMemory.limit,
					disabled: true,
				});
				return false;
			}
		}

		switch (type) {
			case "vector":
				return config.enableVectorSearch;
			case "sqlite":
				return config.enableSQLiteOptimizations;
			case "compute":
				return config.enableComputeOptimizations;
			case "data-processing":
				return config.enableDataProcessing;
			default:
				return false;
		}
	}

	/**
	 * Get progressive enhancement strategy based on capabilities
	 */
	getProgressiveEnhancementStrategy(): {
		loadOrder: string[];
		fallbackChain: Record<string, string>;
		enabledFeatures: string[];
		disabledFeatures: string[];
	} {
		const config = this.getOptimizationConfig();
		const loadOrder: string[] = [];
		const fallbackChain: Record<string, string> = {};
		const enabledFeatures: string[] = [];
		const disabledFeatures: string[] = [];

		// Determine load order based on capabilities and performance
		if (config.enableVectorSearch) {
			loadOrder.push("vector-search");
			enabledFeatures.push("vector-search");
			fallbackChain["vector-search"] = "js-vector-search";
		} else {
			disabledFeatures.push("vector-search");
		}

		if (config.enableSQLiteOptimizations) {
			loadOrder.push("sqlite-utils");
			enabledFeatures.push("sqlite-utils");
			fallbackChain["sqlite-utils"] = "js-sqlite-utils";
		} else {
			disabledFeatures.push("sqlite-utils");
		}

		if (config.enableDataProcessing) {
			loadOrder.push("data-processor");
			enabledFeatures.push("data-processor");
			fallbackChain["data-processor"] = "js-data-processor";
		} else {
			disabledFeatures.push("data-processor");
		}

		if (config.enableComputeOptimizations) {
			loadOrder.push("compute-engine");
			enabledFeatures.push("compute-engine");
			fallbackChain["compute-engine"] = "js-compute-engine";
		} else {
			disabledFeatures.push("compute-engine");
		}

		return {
			loadOrder,
			fallbackChain,
			enabledFeatures,
			disabledFeatures,
		};
	}

	/**
	 * Get capabilities summary for debugging
	 */
	getCapabilitiesSummary(): string {
		if (!this.capabilities) {
			return "WASM capabilities not detected yet";
		}

		const { isSupported, performance, hasThreads, hasSIMD, memoryInfo, browserInfo } =
			this.capabilities;
		const config = this.getOptimizationConfig();
		const strategy = this.getProgressiveEnhancementStrategy();

		return `WASM Support: ${isSupported ? "Yes" : "No"}
Performance: ${performance}
Browser: ${browserInfo.name} ${browserInfo.version} (${browserInfo.engine})
Memory: ${Math.round(memoryInfo.available / 1024 / 1024)}MB available / ${Math.round(memoryInfo.limit / 1024 / 1024)}MB limit
Threads: ${hasThreads ? "Yes" : "No"}
SIMD: ${hasSIMD ? "Yes" : "No"}
Bulk Memory: ${this.capabilities.hasBulkMemory ? "Yes" : "No"}
Reference Types: ${this.capabilities.hasReferenceTypes ? "Yes" : "No"}

Optimizations:
- Vector Search: ${config.enableVectorSearch ? "Enabled" : "Disabled"}
- SQLite Utils: ${config.enableSQLiteOptimizations ? "Enabled" : "Disabled"}
- Compute Engine: ${config.enableComputeOptimizations ? "Enabled" : "Disabled"}
- Data Processing: ${config.enableDataProcessing ? "Enabled" : "Disabled"}

Load Order: ${strategy.loadOrder.join(" → ")}
Enabled Features: ${strategy.enabledFeatures.join(", ") || "None"}`;
	}

	/**
	 * Get comprehensive memory information
	 */
	private getMemoryInfo(): WASMCapabilities["memoryInfo"] {
		const defaultInfo = {
			available: 100 * 1024 * 1024, // Default 100MB
			limit: 1024 * 1024 * 1024, // Default 1GB
			usage: 0,
		};

		try {
			if ("memory" in performance && "usedJSHeapSize" in (performance as any).memory) {
				const memory = (performance as any).memory;
				return {
					available: memory.jsHeapSizeLimit - memory.usedJSHeapSize,
					limit: memory.jsHeapSizeLimit,
					usage: memory.usedJSHeapSize,
				};
			}

			// Fallback: estimate based on navigator.deviceMemory if available
			if ("deviceMemory" in navigator) {
				const deviceMemory = (navigator as any).deviceMemory * 1024 * 1024 * 1024; // GB to bytes
				return {
					available: deviceMemory * 0.5, // Assume 50% available for WASM
					limit: deviceMemory,
					usage: deviceMemory * 0.1, // Estimate 10% current usage
				};
			}

			return defaultInfo;
		} catch (error) {
			observability.recordError("wasm.memory-info.failed", error as Error);
			return defaultInfo;
		}
	}
}

// Export singleton instance
export const wasmDetector = WASMDetector.getInstance();

// Utility functions
export const detectWASMCapabilities = () => wasmDetector.detectCapabilities();
export const getWASMOptimizationConfig = () => wasmDetector.getOptimizationConfig();
export const shouldUseWASMOptimization = (type: "vector" | "sqlite" | "compute") =>
	wasmDetector.shouldUseOptimization(type);
