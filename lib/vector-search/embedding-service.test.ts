import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { WASMServices } from "../wasm-services";
import { EmbeddingService } from "./embedding-service";

// Mock dependencies
vi.mock("../observability", () => ({
	ObservabilityService: {
		getInstance: () => ({
			trackOperation: vi.fn((name, fn) => fn()),
		}),
	},
}));

vi.mock("../wasm-services", () => ({
	WASMServices: {
		isAvailable: vi.fn(() => false),
		getVectorSearch: vi.fn(),
	},
}));

vi.mock("openai", () => ({
	OpenAI: vi.fn().mockImplementation(() => ({
		embeddings: {
			create: vi.fn(),
		},
	})),
}));

describe("EmbeddingService", () => {
	let embeddingService: EmbeddingService;
	let mockOpenAI: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Reset singleton
		(EmbeddingService as any).instance = null;

		embeddingService = EmbeddingService.getInstance();
		mockOpenAI = (embeddingService as any).openai;
	});

	describe("generateEmbedding", () => {
		it("should generate embedding using OpenAI when WASM is not available", async () => {
			const mockEmbedding = Array.from({ length: 1536 }, () => Math.random());
			mockOpenAI.embeddings.create.mockResolvedValue({
				data: [{ embedding: mockEmbedding }],
				usage: { total_tokens: 10 },
			});

			(WASMServices.isAvailable as Mock).mockReturnValue(false);

			const result = await embeddingService.generateEmbedding("test text");

			expect(result).toEqual({
				embedding: mockEmbedding,
				tokenCount: 10,
				model: "text-embedding-3-small",
			});

			expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
				model: "text-embedding-3-small",
				input: "test text",
				dimensions: 1536,
			});
		});

		it("should use WASM when available", async () => {
			const mockEmbedding = Array.from({ length: 1536 }, () => Math.random());
			const mockWASMVectorSearch = {
				generateEmbedding: vi.fn().mockResolvedValue(mockEmbedding),
			};

			(WASMServices.isAvailable as Mock).mockReturnValue(true);
			(WASMServices.getVectorSearch as Mock).mockResolvedValue(mockWASMVectorSearch);

			const result = await embeddingService.generateEmbedding("test text");

			expect(result).toEqual({
				embedding: mockEmbedding,
				tokenCount: 2, // estimated from "test text"
				model: "wasm-local",
			});

			expect(mockWASMVectorSearch.generateEmbedding).toHaveBeenCalledWith("test text");
			expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
		});

		it("should fallback to OpenAI when WASM fails", async () => {
			const mockEmbedding = Array.from({ length: 1536 }, () => Math.random());
			const mockWASMVectorSearch = {
				generateEmbedding: vi.fn().mockRejectedValue(new Error("WASM error")),
			};

			(WASMServices.isAvailable as Mock).mockReturnValue(true);
			(WASMServices.getVectorSearch as Mock).mockResolvedValue(mockWASMVectorSearch);

			mockOpenAI.embeddings.create.mockResolvedValue({
				data: [{ embedding: mockEmbedding }],
				usage: { total_tokens: 10 },
			});

			const result = await embeddingService.generateEmbedding("test text");

			expect(result).toEqual({
				embedding: mockEmbedding,
				tokenCount: 10,
				model: "text-embedding-3-small",
			});

			expect(mockWASMVectorSearch.generateEmbedding).toHaveBeenCalled();
			expect(mockOpenAI.embeddings.create).toHaveBeenCalled();
		});
	});

	describe("generateTaskEmbedding", () => {
		it("should combine title and description for task embedding", async () => {
			const mockEmbedding = Array.from({ length: 1536 }, () => Math.random());
			mockOpenAI.embeddings.create.mockResolvedValue({
				data: [{ embedding: mockEmbedding }],
				usage: { total_tokens: 15 },
			});

			const task = {
				title: "Fix bug",
				description: "Fix the authentication bug in login flow",
			};

			const result = await embeddingService.generateTaskEmbedding(task);

			expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
				model: "text-embedding-3-small",
				input: "Fix bug Fix the authentication bug in login flow",
				dimensions: 1536,
			});

			expect(result.embedding).toEqual(mockEmbedding);
		});

		it("should handle task with only title", async () => {
			const mockEmbedding = Array.from({ length: 1536 }, () => Math.random());
			mockOpenAI.embeddings.create.mockResolvedValue({
				data: [{ embedding: mockEmbedding }],
				usage: { total_tokens: 5 },
			});

			const task = {
				title: "Fix bug",
				description: null,
			};

			const result = await embeddingService.generateTaskEmbedding(task);

			expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
				model: "text-embedding-3-small",
				input: "Fix bug",
				dimensions: 1536,
			});
		});
	});

	describe("generateMemoryEmbedding", () => {
		it("should combine context key and content for memory embedding", async () => {
			const mockEmbedding = Array.from({ length: 1536 }, () => Math.random());
			mockOpenAI.embeddings.create.mockResolvedValue({
				data: [{ embedding: mockEmbedding }],
				usage: { total_tokens: 20 },
			});

			const memory = {
				contextKey: "user-preferences",
				content: "User prefers dark mode and compact layout",
				metadata: { tags: ["ui", "preferences"] },
			};

			const result = await embeddingService.generateMemoryEmbedding(memory);

			expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
				model: "text-embedding-3-small",
				input: "user-preferences User prefers dark mode and compact layout ui preferences",
				dimensions: 1536,
			});
		});
	});

	describe("calculateSimilarity", () => {
		it("should calculate cosine similarity correctly", () => {
			const embedding1 = [1, 0, 0];
			const embedding2 = [0, 1, 0];
			const embedding3 = [1, 0, 0];

			const similarity1 = embeddingService.calculateSimilarity(embedding1, embedding2);
			const similarity2 = embeddingService.calculateSimilarity(embedding1, embedding3);

			expect(similarity1).toBe(0); // Orthogonal vectors
			expect(similarity2).toBe(1); // Identical vectors
		});

		it("should throw error for different dimensions", () => {
			const embedding1 = [1, 0];
			const embedding2 = [0, 1, 0];

			expect(() => {
				embeddingService.calculateSimilarity(embedding1, embedding2);
			}).toThrow("Embeddings must have the same dimensions");
		});
	});

	describe("findSimilar", () => {
		it("should find similar embeddings above threshold", () => {
			const queryEmbedding = [1, 0, 0];
			const candidates = [
				{ id: "1", embedding: [1, 0, 0] }, // similarity = 1
				{ id: "2", embedding: [0.8, 0.6, 0] }, // similarity ≈ 0.8
				{ id: "3", embedding: [0, 1, 0] }, // similarity = 0
				{ id: "4", embedding: [0.9, 0.436, 0] }, // similarity ≈ 0.9
			];

			const results = embeddingService.findSimilar(queryEmbedding, candidates, 10, 0.7);

			expect(results).toHaveLength(3);
			expect(results[0].id).toBe("1");
			expect(results[0].similarity).toBe(1);
			expect(results[1].similarity).toBeGreaterThan(0.8);
			expect(results[2].similarity).toBeGreaterThan(0.7);
		});

		it("should limit results to topK", () => {
			const queryEmbedding = [1, 0, 0];
			const candidates = [
				{ id: "1", embedding: [1, 0, 0] },
				{ id: "2", embedding: [0.9, 0.436, 0] },
				{ id: "3", embedding: [0.8, 0.6, 0] },
			];

			const results = embeddingService.findSimilar(queryEmbedding, candidates, 2, 0.5);

			expect(results).toHaveLength(2);
			expect(results[0].similarity).toBeGreaterThanOrEqual(results[1].similarity);
		});
	});

	describe("validateEmbedding", () => {
		it("should validate correct embedding", () => {
			const validEmbedding = Array.from({ length: 1536 }, () => Math.random());
			expect(embeddingService.validateEmbedding(validEmbedding)).toBe(true);
		});

		it("should reject invalid embeddings", () => {
			expect(embeddingService.validateEmbedding([])).toBe(false);
			expect(embeddingService.validateEmbedding(Array.from({ length: 100 }, () => 1))).toBe(false);
			expect(
				embeddingService.validateEmbedding(Array.from({ length: 1536 }, () => Number.NaN))
			).toBe(false);
			expect(embeddingService.validateEmbedding("not an array" as any)).toBe(false);
		});
	});

	describe("normalizeEmbedding", () => {
		it("should normalize embedding to unit vector", () => {
			const embedding = [3, 4, 0]; // magnitude = 5
			const normalized = embeddingService.normalizeEmbedding(embedding);

			expect(normalized).toEqual([0.6, 0.8, 0]);

			// Check that magnitude is 1
			const magnitude = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0));
			expect(magnitude).toBeCloseTo(1, 10);
		});

		it("should handle zero vector", () => {
			const embedding = [0, 0, 0];
			const normalized = embeddingService.normalizeEmbedding(embedding);

			expect(normalized).toEqual([0, 0, 0]);
		});
	});
});
