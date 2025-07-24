/**
 * WASM Module Loader
 *
 * Manages the loading, caching, and initialization of WebAssembly modules
 * with progressive enhancement and error handling.
 */

import { observability } from "../observability";
import {
	type LoadedModule,
	type ModuleLoadProgress,
	type WASMModuleConfig,
	wasmObservability,
} from "./observability-integration";

export interface WASMModuleCache {
	module: WebAssembly.Module;
	timestamp: Date;
	size: number;
	hits: number;
}

/**
 * WASM Module Loader with caching and progressive loading
 */
export class WASMModuleLoader {
	private static instance: WASMModuleLoader;
	private moduleCache: Map<string, WASMModuleCache> = new Map();
	private loadingPromises: Map<string, Promise<LoadedModule>> = new Map();
	private maxCacheSize = 50 * 1024 * 1024; // 50MB
	private currentCacheSize = 0;

	static getInstance(): WASMModuleLoader {
		if (!WASMModuleLoader.instance) {
			WASMModuleLoader.instance = new WASMModuleLoader();
		}
		return WASMModuleLoader.instance;
	}

	/**
	 * Load a WASM module with caching
	 */
	async loadModule(
		name: string,
		url: string,
		config: WASMModuleConfig,
		onProgress?: (progress: ModuleLoadProgress) => void
	): Promise<LoadedModule> {
		// Check if already loading
		if (this.loadingPromises.has(name)) {
			return this.loadingPromises.get(name)!;
		}

		const loadPromise = this.performModuleLoad(name, url, config, onProgress);
		this.loadingPromises.set(name, loadPromise);

		try {
			const result = await loadPromise;
			return result;
		} finally {
			this.loadingPromises.delete(name);
		}
	}

	/**
	 * Perform the actual module loading
	 */
	private async performModuleLoad(
		name: string,
		url: string,
		config: WASMModuleConfig,
		onProgress?: (progress: ModuleLoadProgress) => void
	): Promise<LoadedModule> {
		return observability.trackOperation(`wasm.module-loader.load.${name}`, async () => {
			try {
				// Check cache first
				const cached = this.moduleCache.get(name);
				if (cached) {
					cached.hits++;
					onProgress?.({
						module: name,
						stage: "complete",
						progress: 100,
					});

					const instance = await WebAssembly.instantiate(cached.module, this.createImports(config));
					return wasmObservability.trackModuleLoad(name, Promise.resolve(instance), config);
				}

				// Download stage
				onProgress?.({
					module: name,
					stage: "downloading",
					progress: 0,
				});

				const response = await fetch(url);
				if (!response.ok) {
					throw new Error(`Failed to fetch WASM module: ${response.status} ${response.statusText}`);
				}

				const contentLength = Number.parseInt(response.headers.get("content-length") || "0");
				const reader = response.body?.getReader();
				const chunks: Uint8Array[] = [];
				let receivedLength = 0;

				if (reader) {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						chunks.push(value);
						receivedLength += value.length;

						if (contentLength > 0) {
							const progress = (receivedLength / contentLength) * 30; // 30% for download
							onProgress?.({
								module: name,
								stage: "downloading",
								progress,
							});
						}
					}
				}

				const wasmBytes = new Uint8Array(receivedLength);
				let position = 0;
				for (const chunk of chunks) {
					wasmBytes.set(chunk, position);
					position += chunk.length;
				}

				// Compilation stage
				onProgress?.({
					module: name,
					stage: "compiling",
					progress: 40,
				});

				const wasmModule = await WebAssembly.compile(wasmBytes);

				// Cache the compiled module
				this.cacheModule(name, wasmModule, wasmBytes.length);

				onProgress?.({
					module: name,
					stage: "compiling",
					progress: 70,
				});

				// Instantiation stage
				onProgress?.({
					module: name,
					stage: "instantiating",
					progress: 80,
				});

				const imports = this.createImports(config);
				const instance = await WebAssembly.instantiate(wasmModule, imports);

				onProgress?.({
					module: name,
					stage: "complete",
					progress: 100,
				});

				// Track with observability
				return wasmObservability.trackModuleLoad(name, Promise.resolve(instance), config);
			} catch (error) {
				onProgress?.({
					module: name,
					stage: "error",
					progress: 0,
					error: (error as Error).message,
				});
				throw error;
			}
		});
	}

	/**
	 * Create imports object for WASM module
	 */
	private createImports(config: WASMModuleConfig): WebAssembly.Imports {
		const memory = new WebAssembly.Memory({
			initial: Math.floor(config.memoryLimit / (64 * 1024)),
			maximum: Math.floor(config.memoryLimit / (64 * 1024)) * 2,
		});

		return {
			env: {
				memory,
				// Math functions
				Math_sqrt: Math.sqrt,
				Math_pow: Math.pow,
				Math_sin: Math.sin,
				Math_cos: Math.cos,
				Math_tan: Math.tan,
				Math_log: Math.log,
				Math_exp: Math.exp,
				Math_floor: Math.floor,
				Math_ceil: Math.ceil,
				Math_round: Math.round,
				Math_abs: Math.abs,
				Math_min: Math.min,
				Math_max: Math.max,

				// Console functions
				console_log: (ptr: number, len: number) => {
					console.log(`WASM ${config.name}: ${ptr}-${len}`);
				},
				console_error: (ptr: number, len: number) => {
					console.error(`WASM ${config.name} Error: ${ptr}-${len}`);
				},

				// Performance functions
				performance_now: () => performance.now(),

				// Memory management
				malloc: (size: number) => {
					// Simple malloc implementation
					return 0; // Would need proper implementation
				},
				free: (ptr: number) => {
					// Simple free implementation
				},

				// Abort function
				abort: () => {
					throw new Error(`WASM module ${config.name} aborted`);
				},
			},

			// Additional imports based on capabilities
			...(config.capabilities.includes("threads") && {
				wasi_snapshot_preview1: {
					// WASI imports for threading
				},
			}),
		};
	}

	/**
	 * Cache a compiled WASM module
	 */
	private cacheModule(name: string, module: WebAssembly.Module, size: number): void {
		// Check if we need to evict modules to make space
		while (this.currentCacheSize + size > this.maxCacheSize && this.moduleCache.size > 0) {
			this.evictLeastUsedModule();
		}

		const cacheEntry: WASMModuleCache = {
			module,
			timestamp: new Date(),
			size,
			hits: 0,
		};

		this.moduleCache.set(name, cacheEntry);
		this.currentCacheSize += size;

		observability.recordEvent("wasm.module-loader.cached", {
			moduleName: name,
			size,
			totalCacheSize: this.currentCacheSize,
			cachedModules: this.moduleCache.size,
		});
	}

	/**
	 * Evict the least used module from cache
	 */
	private evictLeastUsedModule(): void {
		let leastUsed: string | null = null;
		let minHits = Number.POSITIVE_INFINITY;
		let oldestTime = new Date();

		for (const [name, cache] of this.moduleCache) {
			if (cache.hits < minHits || (cache.hits === minHits && cache.timestamp < oldestTime)) {
				leastUsed = name;
				minHits = cache.hits;
				oldestTime = cache.timestamp;
			}
		}

		if (leastUsed) {
			const evicted = this.moduleCache.get(leastUsed)!;
			this.moduleCache.delete(leastUsed);
			this.currentCacheSize -= evicted.size;

			observability.recordEvent("wasm.module-loader.evicted", {
				moduleName: leastUsed,
				size: evicted.size,
				hits: evicted.hits,
				age: Date.now() - evicted.timestamp.getTime(),
			});
		}
	}

	/**
	 * Preload modules for better performance
	 */
	async preloadModules(
		modules: Array<{ name: string; url: string; config: WASMModuleConfig }>
	): Promise<void> {
		return observability.trackOperation("wasm.module-loader.preload", async () => {
			const loadPromises = modules.map(({ name, url, config }) =>
				this.loadModule(name, url, config).catch((error) => {
					console.warn(`Failed to preload module ${name}:`, error);
					return null;
				})
			);

			const results = await Promise.all(loadPromises);
			const successful = results.filter((r) => r !== null).length;

			observability.recordEvent("wasm.module-loader.preload-complete", {
				totalModules: modules.length,
				successfulLoads: successful,
				failedLoads: modules.length - successful,
			});
		});
	}

	/**
	 * Get WASM exports from a loaded module
	 */
	getWASMExports(moduleName: string): WebAssembly.Exports | null {
		const module = wasmObservability.getModule(moduleName);
		return module ? module.exports : null;
	}

	/**
	 * Clear module cache
	 */
	clearCache(): void {
		this.moduleCache.clear();
		this.currentCacheSize = 0;

		observability.recordEvent("wasm.module-loader.cache-cleared", {
			timestamp: new Date(),
		});
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): {
		totalModules: number;
		totalSize: number;
		maxSize: number;
		hitRate: number;
		modules: Array<{ name: string; size: number; hits: number; age: number }>;
	} {
		const modules = Array.from(this.moduleCache.entries()).map(([name, cache]) => ({
			name,
			size: cache.size,
			hits: cache.hits,
			age: Date.now() - cache.timestamp.getTime(),
		}));

		const totalHits = modules.reduce((sum, m) => sum + m.hits, 0);
		const totalRequests = totalHits + this.loadingPromises.size;
		const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

		return {
			totalModules: this.moduleCache.size,
			totalSize: this.currentCacheSize,
			maxSize: this.maxCacheSize,
			hitRate,
			modules,
		};
	}
}

// Export singleton instance
export const moduleLoader = WASMModuleLoader.getInstance();

// Utility functions
export const loadWASMModule = (
	name: string,
	url: string,
	config: WASMModuleConfig,
	onProgress?: (progress: ModuleLoadProgress) => void
) => moduleLoader.loadModule(name, url, config, onProgress);

export const preloadWASMModules = (
	modules: Array<{ name: string; url: string; config: WASMModuleConfig }>
) => moduleLoader.preloadModules(modules);

export const getWASMExports = (moduleName: string) => moduleLoader.getWASMExports(moduleName);
