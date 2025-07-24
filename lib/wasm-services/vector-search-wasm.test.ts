import { beforeEach, describe, expect, it, vi } from "vitest";
import { VectorSearchWASM } from "./vector-search-wasm";

// Mock dependencies
vi.mock("../observability", () => ({
	ObservabilityService: {
		getInstance: () => ({
			trackOperation: vi.fn((name, fn) => fn()),
		}),
	},
}));

describe("VectorSearchWASM", () => {
	let vectorSearch: VectorSearchWASM;

	beforeEach(() => {
		vectorSearch = new VectorSearchWASM();
	});

	describe("initialization", () => {
		it("should initialize successfully", async () => {
			await vectorSearch.initialize();
			expect(vectorSearch.isUsingWASM()).toBe(false); // Falls back to JS
		});

		it("should not reinitialize if already initialized", async () => {
			await vectorSearch.initialize();
			const spy = vi.spyOn(console, "log");

			await vectorSearch.initialize();

			// Should not log initialization message again
			expect(spy).not.toHaveBeenCalledWith(
				"WASM vector search not available, using JavaScript fallback"
			);
		});
	});

	describe("vector operations", () => {
		beforeEach(async () => {
			await vectorSearch.initialize();
		});

		it("should add vectors to index", async () => {
			const embedding = Array.from({ length: 1536 }, () => Math.random());

			await vectorSearch.addVector("test-1", embedding, { type: "test" });

			const stats = await vectorSearch.getIndexStats();
			expect(stats.vectorCount).toBe(1);
			expect(stats.dimensions).toBe(1536);
		});

		it("should build index from multiple vectors", async () => {
			const vectors = [
				{
					id: "vec-1",
					embedding: Array.from({ length: 1536 }, () => Math.random()),
					metadata: { type: "test1" },
				},
				{
					id: "vec-2",
					embedding: Array.from({ length: 1536 }, () => Math.random()),
					metadata: { type: "test2" },
				},
			];

			await vectorSearch.buildIndex(vectors);

			const stats = await vectorSearch.getIndexStats();
			expect(stats.vectorCount).toBe(2);
		});

		it("should search for similar vectors", async () => {
			// Add some test vectors
			const baseEmbedding = Array.from({ length: 1536 }, (_, i) => (i % 2 === 0 ? 1 : 0));
			const similarEmbedding = Array.from({ length: 1536 }, (_, i) => (i % 2 === 0 ? 0.9 : 0.1));
			const differentEmbedding = Array.from({ length: 1536 }, (_, i) => (i % 2 === 0 ? 0 : 1));

			await vectorSearch.addVector("base", baseEmbedding);
			await vectorSearch.addVector("similar", similarEmbedding);
			await vectorSearch.addVector("different", differentEmbedding);

			const results = await vectorSearch.searchSimilar(baseEmbedding, 10, 0.5);

			expect(results.length).toBeGreaterThan(0);
			expect(results[0].id).toBe("base"); // Should find itself first
			expect(results[0].score).toBe(1); // Perfect match
		});

		it("should remove vectors from index", async () => {
			const embedding = Array.from({ length: 1536 }, () => Math.random());

			await vectorSearch.addVector("to-remove", embedding);
			expect((await vectorSearch.getIndexStats()).vectorCount).toBe(1);

			await vectorSearch.removeVector("to-remove");
			expect((await vectorSearch.getIndexStats()).vectorCount).toBe(0);
		});

		it("should clear entire index", async () => {
			const vectors = [
				{ id: "1", embedding: Array.from({ length: 1536 }, () => Math.random()) },
				{ id: "2", embedding: Array.from({ length: 1536 }, () => Math.random()) },
			];

			await vectorSearch.buildIndex(vectors);
			expect((await vectorSearch.getIndexStats()).vectorCount).toBe(2);

			await vectorSearch.clearIndex();
			expect((await vectorSearch.getIndexStats()).vectorCount).toBe(0);
		});
	});

	describe("embedding generation", () => {
		beforeEach(async () => {
			await vectorSearch.initialize();
		});

		it("should generate simple embedding for text", async () => {
			const embedding = await vectorSearch.generateEmbedding("test text");

			expect(embedding).toHaveLength(1536);
			expect(embedding.every((val) => typeof val === "number")).toBe(true);

			// Should be normalized (magnitude close to 1)
			const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
			expect(magnitude).toBeCloseTo(1, 1);
		});

		it("should generate different embeddings for different texts", async () => {
			const embedding1 = await vectorSearch.generateEmbedding("hello world");
			const embedding2 = await vectorSearch.generateEmbedding("goodbye world");

			expect(embedding1).not.toEqual(embedding2);
		});

		it("should generate consistent embeddings for same text", async () => {
			const embedding1 = await vectorSearch.generateEmbedding("consistent text");
			const embedding2 = await vectorSearch.generateEmbedding("consistent text");

			expect(embedding1).toEqual(embedding2);
		});
	});

	describe("similarity calculation", () => {
		it("should calculate cosine similarity correctly", () => {
			const vectorSearch = new VectorSearchWASM();

			// Test orthogonal vectors
			const vec1 = [1, 0, 0];
			const vec2 = [0, 1, 0];
			const similarity1 = (vectorSearch as any).calculateCosineSimilarity(vec1, vec2);
			expect(similarity1).toBe(0);

			// Test identical vectors
			const vec3 = [1, 0, 0];
			const vec4 = [1, 0, 0];
			const similarity2 = (vectorSearch as any).calculateCosineSimilarity(vec3, vec4);
			expect(similarity2).toBe(1);

			// Test opposite vectors
			const vec5 = [1, 0, 0];
			const vec6 = [-1, 0, 0];
			const similarity3 = (vectorSearch as any).calculateCosineSimilarity(vec5, vec6);
			expect(similarity3).toBe(-1);
		});

		it("should throw error for mismatched dimensions", () => {
			const vectorSearch = new VectorSearchWASM();

			expect(() => {
				(vectorSearch as any).calculateCosineSimilarity([1, 0], [1, 0, 0]);
			}).toThrow("Vectors must have the same dimensions");
		});
	});

	describe("index statistics", () => {
		beforeEach(async () => {
			await vectorSearch.initialize();
		});

		it("should return correct stats for empty index", async () => {
			const stats = await vectorSearch.getIndexStats();

			expect(stats.vectorCount).toBe(0);
			expect(stats.dimensions).toBe(0);
			expect(stats.memoryUsage).toBe(0);
		});

		it("should return correct stats after adding vectors", async () => {
			const embedding = Array.from({ length: 1536 }, () => Math.random());
			await vectorSearch.addVector("test", embedding);

			const stats = await vectorSearch.getIndexStats();

			expect(stats.vectorCount).toBe(1);
			expect(stats.dimensions).toBe(1536);
			expect(stats.memoryUsage).toBeGreaterThan(0);
		});

		it("should track index size correctly", async () => {
			expect(vectorSearch.getIndexSize()).toBe(0);

			const embedding = Array.from({ length: 1536 }, () => Math.random());
			await vectorSearch.addVector("test", embedding);

			expect(vectorSearch.getIndexSize()).toBe(1);
		});
	});
});
