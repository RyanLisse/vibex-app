/**
 * WASM Integration Tests
 *
 * Tests WASM module loading, vector search functionality,
 * and performance optimizations.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentMemoryService } from "@/lib/agent-memory/memory-service";
import { WASMServices } from "@/lib/wasm/services";
import { createOptimizedEmbedding, VectorSearchWASM } from "@/lib/wasm/vector-search";

// Mock WebAssembly availability
const mockWebAssembly = {
	compile: vi.fn().mockResolvedValue({}),
	instantiate: vi.fn().mockResolvedValue({
		instance: {
			exports: {
				generateEmbedding: vi.fn().mockReturnValue([0.1, 0.2, 0.3]),
				search: vi.fn().mockReturnValue([{ id: "test", score: 0.8 }]),
				addVector: vi.fn(),
				buildIndex: vi.fn(),
			},
		},
	}),
	Memory: vi.fn().mockImplementation(() => ({})),
};

// Mock global WebAssembly
Object.defineProperty(global, "WebAssembly", {
	value: mockWebAssembly,
	writable: true,
});

// Mock performance API
Object.defineProperty(global, "performance", {
	value: {
		now: vi.fn(() => Date.now()),
		memory: {
			usedJSHeapSize: 1000000,
			totalJSHeapSize: 2000000,
			jsHeapSizeLimit: 4000000,
		},
	},
	writable: true,
});

// Mock crossOriginIsolated
Object.defineProperty(global, "crossOriginIsolated", {
	value: true,
	writable: true,
});

describe("WASM Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("WASM Availability Detection", () => {
		it("should detect WASM availability correctly", async () => {
			const isAvailable = await WASMServices.checkAvailability();
			expect(isAvailable).toBe(true);
		});

		it("should handle missing WebAssembly gracefully", async () => {
			// Temporarily remove WebAssembly
			const originalWebAssembly = global.WebAssembly;
			delete (global as any).WebAssembly;

			const isAvailable = await WASMServices.checkAvailability();
			expect(isAvailable).toBe(false);

			// Restore WebAssembly
			global.WebAssembly = originalWebAssembly;
		});

		it("should check memory constraints", async () => {
			// Mock low memory scenario
			const originalPerformance = global.performance;
			global.performance = {
				...originalPerformance,
				memory: {
					usedJSHeapSize: 90000000,
					totalJSHeapSize: 95000000,
					jsHeapSizeLimit: 100000000, // Very low limit
				},
			};

			const isAvailable = await WASMServices.checkAvailability();
			expect(isAvailable).toBe(false);

			// Restore performance
			global.performance = originalPerformance;
		});
	});

	describe("Vector Search WASM", () => {
		let vectorSearch: VectorSearchWASM;

		beforeEach(async () => {
			vectorSearch = new VectorSearchWASM({
				dimensions: 384,
				similarityThreshold: 0.7,
				maxResults: 10,
				enableCache: true,
			});
			await vectorSearch.initialize();
		});

		it("should initialize successfully", async () => {
			expect(vectorSearch).toBeDefined();
			const stats = vectorSearch.getStats();
			expect(stats.isWASMEnabled).toBe(true);
		});

		it("should add documents to the index", async () => {
			const document = {
				id: "doc-1",
				content: "Test document content",
				embedding: [0.1, 0.2, 0.3, 0.4],
				metadata: { type: "test" },
			};

			await vectorSearch.addDocument(document);

			expect(vectorSearch.hasDocument("doc-1")).toBe(true);
			expect(vectorSearch.getDocumentCount()).toBe(1);
		});

		it("should perform vector similarity search", async () => {
			// Add test documents
			const documents = [
				{
					id: "doc-1",
					content: "Machine learning algorithms",
					embedding: [0.8, 0.2, 0.1, 0.3],
					metadata: { category: "AI" },
				},
				{
					id: "doc-2",
					content: "Database optimization techniques",
					embedding: [0.1, 0.8, 0.3, 0.2],
					metadata: { category: "Database" },
				},
				{
					id: "doc-3",
					content: "Neural network architectures",
					embedding: [0.7, 0.3, 0.2, 0.4],
					metadata: { category: "AI" },
				},
			];

			await vectorSearch.addDocuments(documents);

			// Search for AI-related content
			const queryEmbedding = [0.8, 0.2, 0.1, 0.3]; // Similar to doc-1
			const results = await vectorSearch.search(queryEmbedding, {
				maxResults: 2,
				threshold: 0.5,
			});

			expect(results).toHaveLength(2);
			expect(results[0].document.id).toBe("doc-1");
			expect(results[0].similarity).toBeGreaterThan(0.9);
		});

		it("should handle batch document addition", async () => {
			const documents = Array.from({ length: 100 }, (_, i) => ({
				id: `doc-${i}`,
				content: `Document ${i} content`,
				embedding: Array.from({ length: 384 }, () => Math.random()),
				metadata: { index: i },
			}));

			const startTime = performance.now();
			await vectorSearch.addDocuments(documents);
			const endTime = performance.now();

			expect(vectorSearch.getDocumentCount()).toBe(100);
			expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
		});

		it("should cache search results", async () => {
			const document = {
				id: "doc-1",
				content: "Cached document",
				embedding: [0.5, 0.5, 0.5, 0.5],
				metadata: {},
			};

			await vectorSearch.addDocument(document);

			const queryEmbedding = [0.5, 0.5, 0.5, 0.5];

			// First search
			const startTime1 = performance.now();
			const results1 = await vectorSearch.search(queryEmbedding);
			const endTime1 = performance.now();

			// Second search (should use cache)
			const startTime2 = performance.now();
			const results2 = await vectorSearch.search(queryEmbedding);
			const endTime2 = performance.now();

			expect(results1).toEqual(results2);
			expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1);
		});

		it("should handle document removal", async () => {
			const document = {
				id: "doc-to-remove",
				content: "Document to be removed",
				embedding: [0.1, 0.2, 0.3, 0.4],
				metadata: {},
			};

			await vectorSearch.addDocument(document);
			expect(vectorSearch.hasDocument("doc-to-remove")).toBe(true);

			const removed = await vectorSearch.removeDocument("doc-to-remove");
			expect(removed).toBe(true);
			expect(vectorSearch.hasDocument("doc-to-remove")).toBe(false);
		});

		it("should provide accurate statistics", async () => {
			const documents = Array.from({ length: 10 }, (_, i) => ({
				id: `doc-${i}`,
				content: `Document ${i}`,
				embedding: Array.from({ length: 384 }, () => Math.random()),
				metadata: { index: i },
			}));

			await vectorSearch.addDocuments(documents);

			// Perform some searches to generate stats
			for (let i = 0; i < 5; i++) {
				await vectorSearch.search(Array.from({ length: 384 }, () => Math.random()));
			}

			const stats = vectorSearch.getStats();
			expect(stats.documentsCount).toBe(10);
			expect(stats.isWASMEnabled).toBe(true);
			expect(stats.averageQueryTime).toBeGreaterThan(0);
		});

		it("should clear all data", () => {
			vectorSearch.clear();
			expect(vectorSearch.getDocumentCount()).toBe(0);
		});
	});

	describe("Embedding Generation", () => {
		it("should generate consistent embeddings", () => {
			const text = "Test text for embedding";
			const embedding1 = createOptimizedEmbedding(text);
			const embedding2 = createOptimizedEmbedding(text);

			expect(embedding1).toEqual(embedding2);
			expect(embedding1).toHaveLength(384); // Default dimensions
		});

		it("should generate different embeddings for different texts", () => {
			const text1 = "First test text";
			const text2 = "Second test text";

			const embedding1 = createOptimizedEmbedding(text1);
			const embedding2 = createOptimizedEmbedding(text2);

			expect(embedding1).not.toEqual(embedding2);
		});

		it("should handle empty text", () => {
			const embedding = createOptimizedEmbedding("");
			expect(embedding).toHaveLength(384);
			expect(embedding.every((val) => !isNaN(val))).toBe(true);
		});

		it("should handle very long text", () => {
			const longText = "a".repeat(10000);
			const embedding = createOptimizedEmbedding(longText);

			expect(embedding).toHaveLength(384);
			expect(embedding.every((val) => !isNaN(val) && isFinite(val))).toBe(true);
		});
	});

	describe("Agent Memory WASM Integration", () => {
		beforeEach(async () => {
			await agentMemoryService.initialize();
		});

		it("should use WASM for semantic search when available", async () => {
			// Store some test memories
			await agentMemoryService.storeMemory(
				"test-agent",
				"test-context",
				"Machine learning best practices"
			);

			await agentMemoryService.storeMemory(
				"test-agent",
				"test-context",
				"Database optimization techniques"
			);

			// Search should use WASM vector search
			const results = await agentMemoryService.searchMemories("machine learning", {
				agentType: "test-agent",
			});

			expect(results.length).toBeGreaterThan(0);
			expect(results[0].similarity).toBeGreaterThan(0.5);
		});

		it("should fall back to JavaScript when WASM fails", async () => {
			// Mock WASM failure
			const originalWebAssembly = global.WebAssembly;
			global.WebAssembly = {
				...originalWebAssembly,
				instantiate: vi.fn().mockRejectedValue(new Error("WASM load failed")),
			};

			const vectorSearch = new VectorSearchWASM();
			await vectorSearch.initialize();

			// Should still work with JavaScript fallback
			const document = {
				id: "fallback-doc",
				content: "Fallback test",
				embedding: [0.1, 0.2, 0.3, 0.4],
				metadata: {},
			};

			await vectorSearch.addDocument(document);
			const results = await vectorSearch.search([0.1, 0.2, 0.3, 0.4]);

			expect(results.length).toBeGreaterThan(0);

			// Restore WebAssembly
			global.WebAssembly = originalWebAssembly;
		});
	});

	describe("Performance Benchmarks", () => {
		it("should handle large-scale vector operations efficiently", async () => {
			const vectorSearch = new VectorSearchWASM({
				dimensions: 384,
				enableCache: false, // Disable cache for accurate benchmarking
			});
			await vectorSearch.initialize();

			// Add 1000 documents
			const documents = Array.from({ length: 1000 }, (_, i) => ({
				id: `perf-doc-${i}`,
				content: `Performance test document ${i}`,
				embedding: Array.from({ length: 384 }, () => Math.random()),
				metadata: { index: i },
			}));

			const addStartTime = performance.now();
			await vectorSearch.addDocuments(documents);
			const addEndTime = performance.now();

			expect(addEndTime - addStartTime).toBeLessThan(10000); // Should complete within 10 seconds

			// Perform 100 searches
			const searchStartTime = performance.now();
			const searchPromises = Array.from({ length: 100 }, () =>
				vectorSearch.search(
					Array.from({ length: 384 }, () => Math.random()),
					{
						maxResults: 10,
					}
				)
			);
			await Promise.all(searchPromises);
			const searchEndTime = performance.now();

			const avgSearchTime = (searchEndTime - searchStartTime) / 100;
			expect(avgSearchTime).toBeLessThan(100); // Average search should be under 100ms
		});

		it("should demonstrate WASM performance advantage", async () => {
			// This test would compare WASM vs JavaScript performance
			// For now, we'll just ensure WASM operations are reasonably fast

			const vectorSearch = new VectorSearchWASM({
				dimensions: 100, // Smaller for faster testing
			});
			await vectorSearch.initialize();

			const documents = Array.from({ length: 100 }, (_, i) => ({
				id: `speed-doc-${i}`,
				content: `Speed test ${i}`,
				embedding: Array.from({ length: 100 }, () => Math.random()),
				metadata: {},
			}));

			await vectorSearch.addDocuments(documents);

			const iterations = 50;
			const startTime = performance.now();

			for (let i = 0; i < iterations; i++) {
				await vectorSearch.search(Array.from({ length: 100 }, () => Math.random()));
			}

			const endTime = performance.now();
			const avgTime = (endTime - startTime) / iterations;

			expect(avgTime).toBeLessThan(50); // Should average under 50ms per search
		});
	});

	describe("Error Handling", () => {
		it("should handle WASM module loading failures gracefully", async () => {
			// Mock WASM loading failure
			const originalWebAssembly = global.WebAssembly;
			global.WebAssembly = {
				...originalWebAssembly,
				compile: vi.fn().mockRejectedValue(new Error("WASM compilation failed")),
			};

			const vectorSearch = new VectorSearchWASM();

			// Should not throw, but fall back to JavaScript
			await expect(vectorSearch.initialize()).resolves.not.toThrow();

			// Restore WebAssembly
			global.WebAssembly = originalWebAssembly;
		});

		it("should handle invalid vector dimensions", async () => {
			const vectorSearch = new VectorSearchWASM({ dimensions: 384 });
			await vectorSearch.initialize();

			const document = {
				id: "invalid-doc",
				content: "Invalid dimensions test",
				embedding: [0.1, 0.2], // Wrong dimensions
				metadata: {},
			};

			// Should handle gracefully
			await expect(vectorSearch.addDocument(document)).resolves.not.toThrow();
		});

		it("should handle memory pressure gracefully", async () => {
			// Mock low memory scenario
			const originalPerformance = global.performance;
			global.performance = {
				...originalPerformance,
				memory: {
					usedJSHeapSize: 95000000,
					totalJSHeapSize: 98000000,
					jsHeapSizeLimit: 100000000,
				},
			};

			const vectorSearch = new VectorSearchWASM();
			await vectorSearch.initialize();

			// Should still work but might use fallbacks
			const document = {
				id: "memory-test",
				content: "Memory pressure test",
				embedding: Array.from({ length: 384 }, () => Math.random()),
				metadata: {},
			};

			await expect(vectorSearch.addDocument(document)).resolves.not.toThrow();

			// Restore performance
			global.performance = originalPerformance;
		});
	});
});
