/**
 * WASM Observability Integration
 *
 * Integrates WASM services with the database observability infrastructure
 * for comprehensive performance tracking and monitoring.
 */

import { observability } from "../observability";
import { PerformanceMetrics } from "../observability/types";
import { wasmPerformanceTracker } from "./performance-tracker";

export interface WASMModuleConfig {
	name: string;
	version: string;
	capabilities: string[];
	memoryLimit: number;
	enableProfiling: boolean;
}

export interface LoadedModule {
	name: string;
	instance: WebAssembly.Instance;
	exports: WebAssembly.Exports;
	loadTime: number;
	memoryUsage: number;
	isActive: boolean;
}

export interface ModuleLoadProgress {
	module: string;
	stage: "downloading" | "compiling" | "instantiating" | "complete" | "error";
	progress: number;
	error?: string;
}

/**
 * WASM Observability Integration for comprehensive monitoring
 */
export class WASMObservabilityIntegration {
	private static instance: WASMObservabilityIntegration;
	private loadedModules: Map<string, LoadedModule> = new Map();
	private wasmServices: any = null;
	private isInitialized = false;

	static getInstance(): WASMObservabilityIntegration {
		if (!WASMObservabilityIntegration.instance) {
			WASMObservabilityIntegration.instance =
				new WASMObservabilityIntegration();
		}
		return WASMObservabilityIntegration.instance;
	}

	/**
	 * Initialize observability integration
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		return observability.trackOperation(
			"wasm.observability.initialize",
			async () => {
				try {
					// Set up performance monitoring
					this.setupPerformanceMonitoring();

					// Set up error tracking
					this.setupErrorTracking();

					// Set up memory monitoring
					this.setupMemoryMonitoring();

					this.isInitialized = true;

					observability.recordEvent("wasm.observability.initialized", {
						timestamp: new Date(),
					});

					console.log("✅ WASM Observability Integration initialized");
				} catch (error) {
					observability.recordError(
						"wasm.observability.initialization-failed",
						error as Error,
					);
					throw error;
				}
			},
		);
	}

	/**
	 * Set WASM services reference to avoid circular dependency
	 */
	setWASMServices(services: any): void {
		this.wasmServices = services;
	}

	/**
	 * Set up performance monitoring
	 */
	private setupPerformanceMonitoring(): void {
		// Monitor WASM operation performance
		const originalTrackOperation = observability.trackOperation;

		// Wrap trackOperation to capture WASM-specific metrics
		observability.trackOperation = async function <T>(
			operationName: string,
			operation: () => Promise<T>,
		): Promise<T> {
			const isWASMOperation = operationName.startsWith("wasm.");
			const startTime = performance.now();
			const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

			try {
				const result = await originalTrackOperation.call(
					this,
					operationName,
					operation,
				);

				if (isWASMOperation) {
					const executionTime = performance.now() - startTime;
					const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
					const memoryUsage = endMemory - startMemory;

					wasmPerformanceTracker.recordOperation(
						operationName,
						executionTime,
						memoryUsage,
						true, // WASM enabled for WASM operations
						{ success: true },
					);
				}

				return result;
			} catch (error) {
				if (isWASMOperation) {
					const executionTime = performance.now() - startTime;
					const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
					const memoryUsage = endMemory - startMemory;

					wasmPerformanceTracker.recordOperation(
						operationName,
						executionTime,
						memoryUsage,
						true,
						{ success: false, error: (error as Error).message },
					);
				}
				throw error;
			}
		};
	}

	/**
	 * Set up error tracking
	 */
	private setupErrorTracking(): void {
		// Global error handler for WASM-related errors
		window.addEventListener("error", (event) => {
			if (event.error && event.error.message?.includes("wasm")) {
				observability.recordError("wasm.runtime.error", event.error);
			}
		});

		// Unhandled promise rejection handler
		window.addEventListener("unhandledrejection", (event) => {
			if (event.reason && event.reason.message?.includes("wasm")) {
				observability.recordError("wasm.promise.rejection", event.reason);
			}
		});
	}

	/**
	 * Set up memory monitoring
	 */
	private setupMemoryMonitoring(): void {
		// Monitor memory usage every 30 seconds
		setInterval(() => {
			if ((performance as any).memory) {
				const memory = (performance as any).memory;

				observability.recordEvent("wasm.memory.usage", {
					usedJSHeapSize: memory.usedJSHeapSize,
					totalJSHeapSize: memory.totalJSHeapSize,
					jsHeapSizeLimit: memory.jsHeapSizeLimit,
					timestamp: new Date(),
				});

				// Alert if memory usage is high
				const memoryUsagePercent =
					(memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
				if (memoryUsagePercent > 80) {
					observability.recordEvent("wasm.memory.high-usage", {
						usagePercent: memoryUsagePercent,
						usedMemory: memory.usedJSHeapSize,
						limit: memory.jsHeapSizeLimit,
						severity: memoryUsagePercent > 90 ? "critical" : "warning",
					});
				}
			}
		}, 30000);
	}

	/**
	 * Track module loading
	 */
	trackModuleLoad(
		moduleName: string,
		loadPromise: Promise<WebAssembly.Instance>,
		config: WASMModuleConfig,
	): Promise<LoadedModule> {
		return observability.trackOperation(
			`wasm.module.load.${moduleName}`,
			async () => {
				const startTime = performance.now();

				observability.recordEvent("wasm.module.load-start", {
					moduleName,
					config,
					timestamp: new Date(),
				});

				try {
					const instance = await loadPromise;
					const loadTime = performance.now() - startTime;
					const memoryUsage = this.estimateModuleMemoryUsage(instance);

					const loadedModule: LoadedModule = {
						name: moduleName,
						instance,
						exports: instance.exports,
						loadTime,
						memoryUsage,
						isActive: true,
					};

					this.loadedModules.set(moduleName, loadedModule);

					observability.recordEvent("wasm.module.load-complete", {
						moduleName,
						loadTime,
						memoryUsage,
						exportsCount: Object.keys(instance.exports).length,
					});

					return loadedModule;
				} catch (error) {
					observability.recordError("wasm.module.load-failed", error as Error);
					throw error;
				}
			},
		);
	}

	/**
	 * Estimate module memory usage
	 */
	private estimateModuleMemoryUsage(instance: WebAssembly.Instance): number {
		// Try to get memory from exports
		if (
			instance.exports.memory &&
			instance.exports.memory instanceof WebAssembly.Memory
		) {
			return instance.exports.memory.buffer.byteLength;
		}

		// Fallback estimation
		return 1024 * 1024; // 1MB default estimate
	}

	/**
	 * Get loaded modules
	 */
	getLoadedModules(): Map<string, LoadedModule> {
		return new Map(this.loadedModules);
	}

	/**
	 * Get module by name
	 */
	getModule(name: string): LoadedModule | undefined {
		return this.loadedModules.get(name);
	}

	/**
	 * Get health status
	 */
	async getHealthStatus(): Promise<{
		isHealthy: boolean;
		loadedModules: number;
		activeModules: number;
		totalMemoryUsage: number;
		averageLoadTime: number;
		recentErrors: number;
	}> {
		const modules = Array.from(this.loadedModules.values());
		const activeModules = modules.filter((m) => m.isActive);
		const totalMemoryUsage = modules.reduce((sum, m) => sum + m.memoryUsage, 0);
		const averageLoadTime =
			modules.length > 0
				? modules.reduce((sum, m) => sum + m.loadTime, 0) / modules.length
				: 0;

		// Get recent errors (last 5 minutes)
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
		const recentErrors = observability
			.getErrors(100)
			.filter(
				(error) =>
					error.timestamp > fiveMinutesAgo && error.operation.includes("wasm"),
			).length;

		const isHealthy = recentErrors < 5 && totalMemoryUsage < 100 * 1024 * 1024; // Less than 100MB

		return {
			isHealthy,
			loadedModules: modules.length,
			activeModules: activeModules.length,
			totalMemoryUsage,
			averageLoadTime,
			recentErrors,
		};
	}

	/**
	 * Cleanup observability integration
	 */
	cleanup(): void {
		this.loadedModules.clear();
		this.isInitialized = false;

		observability.recordEvent("wasm.observability.cleanup", {
			timestamp: new Date(),
		});
	}
}

// Export singleton instance
export const wasmObservability = WASMObservabilityIntegration.getInstance();
