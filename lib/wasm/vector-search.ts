/**
 * WASM Vector Search Service
 *
 * This module provides client-side semantic search capabilities using WebAssembly
 * for high-performance vector operations and similarity calculations.
 */

import { shouldUseWASMOptimization, wasmDetector } from "./detection";
	batchSimilaritySearch,
	createVectorSearchInstance,
	loadVectorSearchWASM,
	type VectorSearch as WASMVectorSearchInstance
} from "./modules/vector-search-loader";

export interface VectorSearchConfig {
	dimensions: number;
	similarityThreshold: number;
	maxResults: number;
	enableCache: boolean;
	cacheSize: number;
}

export interface VectorDocument {
	id: string;
	content: string;
	embedding: number[];
	metadata?: Record<string, any>;
}

export interface VectorSearchResult {
	document: VectorDocument;
	similarity: number;
	rank: number;
}

export interface VectorSearchOptions {
	threshold?: number;
	maxResults?: number;
	filters?: Record<string, any>;
	includeMetadata?: boolean;
}

/**
 * WASM Vector Search Engine
 */
export class VectorSearchWASM {
	private wasmVectorSearch: WASMVectorSearchInstance | null = null;
	private inlineWASMInstance: WebAssembly.Instance | null = null;
	private isInitialized = false;
	private isWASMEnabled = false;
	private documents: Map<string, VectorDocument> = new Map();
	private config: VectorSearchConfig;
	private cache: Map<string, VectorSearchResult[]> = new Map();

	constructor(config: Partial<VectorSearchConfig> = {}) {
		this.config = {
			dimensions: 384, // Default for sentence transformers
			similarityThreshold: 0.7,
			maxResults: 10,
			enableCache: true,
			cacheSize: 1000,
			...config,
		};
	}

	/**
	 * Initialize the WASM vector search engine
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		try {
			// Check if WASM optimization should be used
			if (!shouldUseWASMOptimization("vector")) {
				console.log(
					"WASM vector search not available, using JavaScript fallback",
				);
				this.isInitialized = true;
				this.isWASMEnabled = false;
				return;
			}

			// Try to load the real WASM module
			try {
				await loadVectorSearchWASM();
				this.wasmVectorSearch = await createVectorSearchInstance(
					this.config.dimensions,
				);
				this.isWASMEnabled = true;
				console.log("✅ Real WASM Vector Search module loaded successfully");
			} catch (wasmError) {
				console.warn(
					"Failed to load real WASM module, using inline WASM fallback:",
					wasmError,
				);
				// Fall back to inline WASM module
				await this.loadInlineWASMModule();
				this.isWASMEnabled = false;
			}

			this.isInitialized = true;
			console.log("✅ WASM Vector Search initialized");
		} catch (error) {
			console.warn(
				"Failed to initialize WASM vector search, falling back to JS:",
				error,
			);
			this.isInitialized = true;
			this.isWASMEnabled = false;
		}
	}

	/**
	 * Load inline WASM module for vector operations (fallback)
	 */
	private async loadInlineWASMModule(): Promise<void> {
		try {
			// Load vector operations WASM module with optimized similarity calculations
			const wasmCode = await this.generateVectorWASMModule();
			const wasmModule = await WebAssembly.compile(wasmCode);

			// Create instance with memory for vector operations
			// @ts-expect-error - Workaround for TypeScript bug
			const memory = new WebAssembly.Memory({ initial: 256, maximum: 1024 });
			const wasmInstance = await WebAssembly.instantiate(wasmModule, {
				env: {
					import { memory,
Math_sqrt: Math.sqrt,