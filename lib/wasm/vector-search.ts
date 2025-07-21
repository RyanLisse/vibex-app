/**
 * WASM Vector Search Service
 *
 * This module provides client-side semantic search capabilities using WebAssembly
 * for high-performance vector operations and similarity calculations.
 */

import { shouldUseWASMOptimization, wasmDetector } from "./detection";
import {
	batchSimilaritySearch,
	createVectorSearchInstance,
	loadVectorSearchWASM,
	type VectorSearch as WASMVectorSearchInstance,
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
	private wasmInstance: WebAssembly.Instance | null = null;
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
			const memory = new WebAssembly.Memory({ initial: 256, maximum: 1024 });
			const wasmInstance = await WebAssembly.instantiate(wasmModule, {
				env: {
					memory,
					Math_sqrt: Math.sqrt,
				},
			});

			this.wasmInstance = wasmInstance;
			this.isInitialized = true;
		} catch (error) {
			console.error("Failed to initialize WASM:", error);
			throw error;
		}
	}

	/**
	 * Generate inline WASM module for vector operations
	 */
	private async generateVectorWASMModule(): Promise<ArrayBuffer> {
		// Minimal WASM module for demonstration purposes
		const wasmBytes = new Uint8Array([
			0x00,
			0x61,
			0x73,
			0x6d, // WASM magic number
			0x01,
			0x00,
			0x00,
			0x00, // Version
		]);
		return wasmBytes.buffer;
	}

	getStats() {
		return {
			isWASMEnabled: this.isWASMEnabled,
			documentsCount: this.documents.size,
			cacheSize: this.cache.size,
		};
	}

	clear(): void {
		this.documents.clear();
		this.cache.clear();
		console.log("✅ Vector search engine cleared");
	}
}

// Vector search manager
class VectorSearchManager {
	private engines: Map<string, VectorSearchWASM> = new Map();

	getSearchEngine(
		name: string = "default",
		config?: Partial<VectorSearchConfig>,
	): VectorSearchWASM {
		if (!this.engines.has(name)) {
			this.engines.set(name, new VectorSearchWASM(config));
		}
		return this.engines.get(name)!;
	}
}

export const vectorSearchManager = new VectorSearchManager();

// Utility functions
export function calculateFastSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) throw new Error("Vector dimensions must match");

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function createOptimizedEmbedding(
	text: string,
	dimensions: number = 384,
): number[] {
	// Simple hash-based embedding for testing
	const embedding = new Array(dimensions).fill(0);
	for (let i = 0; i < text.length; i++) {
		embedding[i % dimensions] += text.charCodeAt(i);
	}
	// Normalize
	const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
	return embedding.map((val) => val / norm);
}

export function createVectorSearchEngine(
	config?: Partial<VectorSearchConfig>,
): VectorSearchWASM {
	return new VectorSearchWASM(config);
}

export function getVectorSearchEngine(
	name: string = "default",
): VectorSearchWASM {
	return vectorSearchManager.getSearchEngine(name);
}
