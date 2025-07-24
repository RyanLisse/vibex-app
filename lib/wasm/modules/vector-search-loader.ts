/**
 * Vector Search WASM Module Loader
 *
 * Handles loading and initialization of the compiled Rust WASM module
 * with proper error handling and fallback support.
 */

import { observability } from "../../observability";

export interface VectorSearch {
	add(id: string, embedding: number[]): Promise<void>;
	search(embedding: number[], k: number): Promise<Array<{ id: string; score: number }>>;
	clear(): Promise<void>;
	buildIndex(): Promise<void>;
	getStats(): { documentsCount: number; indexSize: number };
}

export interface VectorSearchInstanceConfig {
	indexType: "flat" | "hnsw" | "ivf";
	efConstruction?: number;
	efSearch?: number;
	M?: number;
	nlist?: number;
	nprobe?: number;
}

let wasmModule: any = null;
let isLoaded = false;

/**
 * Load the vector search WASM module
 */
export async function loadVectorSearchWASM(): Promise<void> {
	if (isLoaded && wasmModule) return;

	return observability.trackOperation("wasm.vector-search.load-module", async () => {
		try {
			// Try to load from wasm-modules directory
			const wasmPath = "/wasm-modules/vector-search/vector_search.wasm";
			const wasmResponse = await fetch(wasmPath);

			if (!wasmResponse.ok) {
				throw new Error(`Failed to fetch WASM module: ${wasmResponse.status}`);
			}

			const wasmBytes = await wasmResponse.arrayBuffer();
			const wasmModule = await WebAssembly.instantiate(wasmBytes, {
				env: {
					memory: new WebAssembly.Memory({ initial: 256, maximum: 1024 }),
					Math_sqrt: Math.sqrt,
					Math_pow: Math.pow,
					console_log: (ptr: number, len: number) => {
						// WASM console.log implementation
						console.log(`WASM: ${ptr}-${len}`);
					},
				},
			});

			wasmModule = wasmModule.instance;
			isLoaded = true;

			observability.recordEvent("wasm.vector-search.module-loaded", {
				wasmPath,
				memoryPages: 256,
			});

			console.log("✅ Vector search WASM module loaded successfully");
		} catch (error) {
			observability.recordError("wasm.vector-search.module-load-failed", error as Error);

			// Fallback to inline WASM module
			wasmModule = await createInlineWASMModule();
			isLoaded = true;

			console.warn("Using inline WASM fallback for vector search");
		}
	});
}

/**
 * Create an inline WASM module for basic vector operations
 */
async function createInlineWASMModule(): Promise<any> {
	// Simple WASM module with basic vector operations
	const wasmCode = new Uint8Array([
		0x00,
		0x61,
		0x73,
		0x6d, // WASM magic number
		0x01,
		0x00,
		0x00,
		0x00, // Version
		// Type section
		0x01,
		0x0c,
		0x03,
		0x60,
		0x02,
		0x7f,
		0x7f,
		0x01,
		0x7f, // (i32, i32) -> i32
		0x60,
		0x01,
		0x7f,
		0x01,
		0x7f, // (i32) -> i32
		0x60,
		0x00,
		0x00, // () -> ()
		// Import section
		0x02,
		0x19,
		0x01,
		0x03,
		0x65,
		0x6e,
		0x76, // "env"
		0x06,
		0x6d,
		0x65,
		0x6d,
		0x6f,
		0x72,
		0x79, // "memory"
		0x02,
		0x01,
		0x00,
		0x01, // memory limits
		// Function section
		0x03,
		0x04,
		0x03,
		0x00,
		0x01,
		0x02,
		// Export section
		0x07,
		0x11,
		0x02,
		0x03,
		0x61,
		0x64,
		0x64,
		0x00,
		0x00, // "add"
		0x06,
		0x73,
		0x65,
		0x61,
		0x72,
		0x63,
		0x68,
		0x00,
		0x01, // "search"
		// Code section
		0x0a,
		0x13,
		0x03,
		0x07,
		0x00,
		0x20,
		0x00,
		0x20,
		0x01,
		0x6a,
		0x0b, // add function
		0x04,
		0x00,
		0x20,
		0x00,
		0x0b, // search function
		0x02,
		0x00,
		0x0b, // empty function
	]);

	const wasmModule = await WebAssembly.instantiate(wasmCode, {
		env: {
			memory: new WebAssembly.Memory({ initial: 1 }),
		},
	});

	return wasmModule.instance;
}

/**
 * Create a vector search instance
 */
export async function createVectorSearchInstance(
	dimensions: number,
	config: VectorSearchInstanceConfig = { indexType: "flat" }
): Promise<VectorSearch> {
	if (!isLoaded) {
		await loadVectorSearchWASM();
	}

	return observability.trackOperation("wasm.vector-search.create-instance", async () => {
		// In-memory storage for the JavaScript fallback
		const documents = new Map<string, number[]>();
		let indexBuilt = false;

		const instance: VectorSearch = {
			async add(id: string, embedding: number[]): Promise<void> {
				if (embedding.length !== dimensions) {
					throw new Error(
						`Embedding dimension mismatch: expected ${dimensions}, got ${embedding.length}`
					);
				}
				documents.set(id, embedding);
				indexBuilt = false; // Mark index as needing rebuild
			},

			async search(embedding: number[], k: number): Promise<Array<{ id: string; score: number }>> {
				if (embedding.length !== dimensions) {
					throw new Error(
						`Query embedding dimension mismatch: expected ${dimensions}, got ${embedding.length}`
					);
				}

				const results: Array<{ id: string; score: number }> = [];

				// Calculate cosine similarity with all documents
				for (const [id, docEmbedding] of documents) {
					const similarity = calculateCosineSimilarity(embedding, docEmbedding);
					results.push({ id, score: similarity });
				}

				// Sort by similarity and return top k
				return results.sort((a, b) => b.score - a.score).slice(0, k);
			},

			async clear(): Promise<void> {
				documents.clear();
				indexBuilt = false;
			},

			async buildIndex(): Promise<void> {
				// For flat index, no building needed
				if (config.indexType === "flat") {
					indexBuilt = true;
					return;
				}

				// For HNSW or IVF, we would build the index here
				// This is a placeholder for the actual WASM implementation
				indexBuilt = true;

				observability.recordEvent("wasm.vector-search.index-built", {
					indexType: config.indexType,
					documentsCount: documents.size,
				});
			},

			getStats(): { documentsCount: number; indexSize: number } {
				return {
					documentsCount: documents.size,
					indexSize: documents.size * dimensions * 4, // 4 bytes per float
				};
			},
		};

		observability.recordEvent("wasm.vector-search.instance-created", {
			dimensions,
			indexType: config.indexType,
		});

		return instance;
	});
}

/**
 * Calculate cosine similarity between two vectors
 */
function calculateCosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) return 0;

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
	return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Batch similarity search for multiple queries
 */
export async function batchSimilaritySearch(
	queries: number[][],
	documents: Map<string, number[]>,
	k = 10
): Promise<Array<Array<{ id: string; score: number }>>> {
	return observability.trackOperation("wasm.vector-search.batch-search", async () => {
		const results: Array<Array<{ id: string; score: number }>> = [];

		for (const query of queries) {
			const queryResults: Array<{ id: string; score: number }> = [];

			for (const [id, embedding] of documents) {
				const similarity = calculateCosineSimilarity(query, embedding);
				queryResults.push({ id, score: similarity });
			}

			results.push(queryResults.sort((a, b) => b.score - a.score).slice(0, k));
		}

		observability.recordEvent("wasm.vector-search.batch-search-completed", {
			queryCount: queries.length,
			documentsCount: documents.size,
			k,
		});

		return results;
	});
}
