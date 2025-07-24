import { ObservabilityService } from "./observability";
import { VectorSearchWASM } from "./wasm-services/vector-search-wasm";

export class WASMServices {
	private static vectorSearch: VectorSearchWASM | null = null;
	private static isWASMAvailable: boolean | null = null;
	private static observability = ObservabilityService.getInstance();

	/**
	 * Check if WASM is available and supported
	 */
	static async checkAvailability(): Promise<boolean> {
		if (WASMServices.isWASMAvailable !== null) {
			return WASMServices.isWASMAvailable;
		}

		try {
			const hasWebAssembly = typeof WebAssembly !== "undefined";
			const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
			const isCrossOriginIsolated =
				typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;

			// Check memory constraints
			const memoryInfo = WASMServices.getMemoryInfo();
			const hasEnoughMemory =
				!memoryInfo.jsHeapSizeLimit || memoryInfo.jsHeapSizeLimit > 100 * 1024 * 1024; // 100MB minimum

			// WASM is available if we have WebAssembly support and enough memory
			// SharedArrayBuffer and cross-origin isolation are nice-to-have for advanced features
			WASMServices.isWASMAvailable = hasWebAssembly && hasEnoughMemory;

			console.log("WASM availability check:", {
				hasWebAssembly,
				hasSharedArrayBuffer,
				isCrossOriginIsolated,
				hasEnoughMemory,
				available: WASMServices.isWASMAvailable,
			});

			return WASMServices.isWASMAvailable;
		} catch (error) {
			console.warn("WASM availability check failed:", error);
			WASMServices.isWASMAvailable = false;
			return false;
		}
	}

	/**
	 * Check if WASM is available (synchronous)
	 */
	static isAvailable(): boolean {
		return WASMServices.isWASMAvailable === true;
	}

	/**
	 * Get vector search service instance
	 */
	static async getVectorSearch(): Promise<VectorSearchWASM> {
		if (!WASMServices.vectorSearch) {
			WASMServices.vectorSearch = new VectorSearchWASM();
			await WASMServices.vectorSearch.initialize();
		}
		return WASMServices.vectorSearch;
	}

	/**
	 * Initialize all WASM services
	 */
	static async initializeAll(): Promise<void> {
		return WASMServices.observability.trackOperation("wasm.initialize-all", async () => {
			const isAvailable = await WASMServices.checkAvailability();

			if (!isAvailable) {
				console.log("WASM not available, skipping initialization");
				return;
			}

			// Initialize vector search
			await WASMServices.getVectorSearch();

			console.log("WASM services initialized successfully");
		});
	}

	/**
	 * Get memory information if available
	 */
	private static getMemoryInfo(): {
		usedJSHeapSize?: number;
		totalJSHeapSize?: number;
		jsHeapSizeLimit?: number;
	} {
		if (
			typeof performance !== "undefined" &&
			"memory" in performance &&
			"usedJSHeapSize" in (performance as any).memory
		) {
			const memory = (performance as any).memory;
			return {
				usedJSHeapSize: memory.usedJSHeapSize,
				totalJSHeapSize: memory.totalJSHeapSize,
				jsHeapSizeLimit: memory.jsHeapSizeLimit,
			};
		}
		return {};
	}

	/**
	 * Get system capabilities
	 */
	static getCapabilities(): {
		webAssembly: boolean;
		sharedArrayBuffer: boolean;
		crossOriginIsolated: boolean;
		memoryInfo: ReturnType<typeof WASMServices.getMemoryInfo>;
	} {
		return {
			webAssembly: typeof WebAssembly !== "undefined",
			sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
			crossOriginIsolated: typeof crossOriginIsolated !== "undefined" && crossOriginIsolated,
			memoryInfo: WASMServices.getMemoryInfo(),
		};
	}

	/**
	 * Reset all services (useful for testing)
	 */
	static reset(): void {
		WASMServices.vectorSearch = null;
		WASMServices.isWASMAvailable = null;
	}
}

// Initialize WASM services when the module is loaded (client-side only)
if (typeof window !== "undefined") {
	WASMServices.initializeAll().catch((error) => {
		console.warn("Failed to initialize WASM services:", error);
	});
}
