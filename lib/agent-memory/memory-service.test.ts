/**
 * Agent Memory Service Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryService } from "./memory-service";

// Hoisted mock functions to ensure stability across tests
const mockVectorSearchInstance = vi.hoisted(() => ({
	initialize: vi.fn().mockResolvedValue(undefined),
	addDocument: vi.fn().mockResolvedValue(undefined),
	addDocuments: vi.fn().mockResolvedValue(undefined),
	search: vi.fn().mockResolvedValue([]),
	removeDocument: vi.fn().mockResolvedValue(true),
	getDocumentCount: vi.fn().mockReturnValue(0),
	getStats: vi.fn().mockReturnValue({}),
}));

const mockVectorSearchWASM = vi.hoisted(() =>
	vi.fn().mockImplementation(() => mockVectorSearchInstance)
);

// Mock dependencies
vi.mock("@/db", () => {
	// Create a comprehensive mock chain that includes all necessary methods
	const createMockChain = () => ({
		select: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		returning: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockResolvedValue([]), // Return empty array for queries
		groupBy: vi.fn().mockReturnThis(),
		and: vi.fn().mockReturnThis(),
		desc: vi.fn().mockReturnThis(),
		gte: vi.fn().mockReturnThis(),
		sql: vi.fn().mockReturnThis(),
		asc: vi.fn().mockReturnThis(),
		lte: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		inArray: vi.fn().mockReturnThis(),
	});

	const mockDbChain = createMockChain();

	return {
		db: mockDbChain,
		and: vi.fn().mockReturnValue({}), // Return empty object for AND conditions
		desc: vi.fn().mockReturnValue({}),
		gte: vi.fn().mockReturnValue({}),
		sql: vi.fn().mockReturnValue({}),
		asc: vi.fn().mockReturnValue({}),
		lte: vi.fn().mockReturnValue({}),
		eq: vi.fn().mockReturnValue({}),
		inArray: vi.fn().mockReturnValue({}),
	};
});

vi.mock("@/lib/observability", () => ({
	observability: {
		trackOperation: vi.fn((name, fn) => fn()),
		recordEvent: vi.fn(),
		recordError: vi.fn(),
	},
}));

vi.mock("@/lib/wasm/vector-search", () => {
	return {
		VectorSearchWASM: mockVectorSearchWASM,
		createOptimizedEmbedding: vi.fn().mockReturnValue([0.1, 0.2, 0.3]),
	};
});

describe("AgentMemoryService", () => {
	let memoryService: AgentMemoryService;

	beforeEach(() => {
		// Reset mock implementations instead of clearing them
		mockVectorSearchInstance.initialize.mockResolvedValue(undefined);
		mockVectorSearchInstance.addDocument.mockResolvedValue(undefined);
		mockVectorSearchInstance.addDocuments.mockResolvedValue(undefined);
		mockVectorSearchInstance.search.mockResolvedValue([]);
		mockVectorSearchInstance.removeDocument.mockResolvedValue(true);
		mockVectorSearchInstance.getDocumentCount.mockReturnValue(0);
		mockVectorSearchInstance.getStats.mockReturnValue({});

		memoryService = new AgentMemoryService();

		// Mock the private loadExistingMemories method to avoid database chain issues
		// @ts-expect-error - accessing private method for testing
		memoryService.loadExistingMemories = vi.fn().mockResolvedValue(undefined);
	});

	// Removed afterEach vi.restoreAllMocks() as it was interfering with test isolation

	describe("initialization", () => {
		it("should initialize successfully", async () => {
			await expect(memoryService.initialize()).resolves.not.toThrow();
		});

		it("should not initialize twice", async () => {
			await memoryService.initialize();
			await memoryService.initialize(); // Should not throw or reinitialize
		});
	});

	describe("storeMemory", () => {
		beforeEach(async () => {
			await memoryService.initialize();
		});

		it("should store a new memory entry", async () => {
			const mockDb = await import("@/db");
			mockDb.db.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]), // No existing memory
					}),
				}),
			});

			mockDb.db.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([
						{
							id: "test-id",
							agentType: "test-agent",
							contextKey: "test-context",
							content: "test content",
							embedding: [0.1, 0.2, 0.3],
							importance: 5,
							createdAt: new Date(),
							lastAccessedAt: new Date(),
							accessCount: 1,
							metadata: {},
						},
					]),
				}),
			});

			const result = await memoryService.storeMemory("test-agent", "test-context", "test content");

			expect(result).toBeDefined();
			expect(result.agentType).toBe("test-agent");
			expect(result.contextKey).toBe("test-context");
			expect(result.content).toBe("test content");
		});

		it("should update existing memory entry", async () => {
			const mockDb = await import("@/db");
			const existingMemory = {
				id: "existing-id",
				agentType: "test-agent",
				contextKey: "test-context",
				content: "old content",
				importance: 3,
				metadata: {},
			};

			mockDb.db.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([existingMemory]),
					}),
				}),
			});

			mockDb.db.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([
							{
								...existingMemory,
								content: "updated content",
								importance: 5,
							},
						]),
					}),
				}),
			});

			const result = await memoryService.storeMemory(
				"test-agent",
				"test-context",
				"updated content",
				{ importance: 5 }
			);

			expect(result.content).toBe("updated content");
			expect(result.importance).toBe(5);
		});
	});

	describe("searchMemories", () => {
		beforeEach(async () => {
			await memoryService.initialize();
		});

		it("should perform semantic search", async () => {
			const mockVectorSearch = memoryService["vectorSearch"];
			const mockResults = [
				{
					document: {
						id: "test-id",
						content: "test content",
						embedding: [0.1, 0.2, 0.3],
						metadata: {
							agentType: "test-agent",
							contextKey: "test-context",
							importance: 5,
						},
					},
					similarity: 0.8,
					rank: 1,
				},
			];

			vi.mocked(mockVectorSearch.search).mockResolvedValue(mockResults);

			const results = await memoryService.searchMemories("test query", {
				agentType: "test-agent",
				maxResults: 10,
			});

			expect(results).toEqual(mockResults);
			expect(mockVectorSearch.search).toHaveBeenCalledWith(
				expect.any(Array), // embedding
				expect.objectContaining({
					threshold: 0.7,
					maxResults: 20, // Gets more for filtering
					filters: { agentType: "test-agent" },
					includeMetadata: true,
				})
			);
		});

		it("should filter results by importance", async () => {
			const mockVectorSearch = memoryService["vectorSearch"];
			const mockResults = [
				{
					document: { id: "1", content: "high importance", embedding: [] },
					similarity: 0.8,
					metadata: { importance: 8 },
				},
				{
					document: { id: "2", content: "low importance", embedding: [] },
					similarity: 0.7,
					metadata: { importance: 2 },
				},
			];

			vi.mocked(mockVectorSearch.search).mockResolvedValue(mockResults);

			const results = await memoryService.searchMemories("test query", {
				minImportance: 5,
			});

			expect(results).toHaveLength(1);
			expect(results[0].metadata?.importance).toBe(8);
		});
	});

	describe("getRelevantContext", () => {
		beforeEach(async () => {
			await memoryService.initialize();
		});

		it("should return relevant context for a task", async () => {
			const mockDb = await import("@/db");
			mockDb.db.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([
						{
							count: 10,
							avgImportance: 5.5,
							oldestDate: new Date("2023-01-01"),
							newestDate: new Date("2024-01-01"),
						},
					]),
				}),
			});

			// Mock searchMemories
			const searchSpy = vi.spyOn(memoryService, "searchMemories").mockResolvedValue([
				{
					document: {
						id: "test-id",
						content: "relevant content",
						embedding: [0.1, 0.2, 0.3],
					},
					similarity: 0.8,
					rank: 1,
					metadata: {
						agentType: "test-agent",
						contextKey: "test-context",
						importance: 7,
						accessCount: 5,
						createdAt: new Date().toISOString(),
						lastAccessedAt: new Date().toISOString(),
					},
				},
			]);

			const context = await memoryService.getRelevantContext(
				"test-agent",
				"implement a new feature"
			);

			expect(context).toBeDefined();
			expect(context.relevantMemories).toHaveLength(1);
			expect(context.totalMemories).toBe(10);
			expect(context.averageImportance).toBe(5.5);
			expect(context.contextSummary).toContain("relevant content");

			searchSpy.mockRestore();
		});
	});

	describe("archiveMemories", () => {
		beforeEach(async () => {
			await memoryService.initialize();
		});

		it("should archive old memories", async () => {
			const mockDb = await import("@/db");
			const oldMemories = [
				{ id: "old-1", content: "old memory 1" },
				{ id: "old-2", content: "old memory 2" },
			];

			mockDb.db.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(oldMemories),
				}),
			});

			mockDb.db.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(undefined),
				}),
			});

			const result = await memoryService.archiveMemories({
				olderThanDays: 90,
				maxImportance: 3,
			});

			expect(result.archived).toBe(2);
			expect(result.errors).toBe(0);
		});

		it("should handle dry run", async () => {
			const mockDb = await import("@/db");

			// Clear the mock before this test to ensure clean state
			vi.clearAllMocks();

			mockDb.db.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ id: "test" }]),
				}),
			});

			const result = await memoryService.archiveMemories({
				dryRun: true,
			});

			expect(result.archived).toBe(1);
			expect(result.errors).toBe(0);
			// Should not actually update database in dry run
			expect(mockDb.db.update).not.toHaveBeenCalled();
		});
	});

	describe("shareKnowledge", () => {
		beforeEach(async () => {
			await memoryService.initialize();
		});

		it("should share knowledge between agents", async () => {
			const mockDb = await import("@/db");
			const memoriesToShare = [
				{
					id: "share-1",
					content: "shared knowledge",
					importance: 7,
					metadata: { source: "original" },
				},
			];

			mockDb.db.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(memoriesToShare),
				}),
			});

			// Mock storeMemory
			const storeSpy = vi.spyOn(memoryService, "storeMemory").mockResolvedValue({
				id: "new-id",
				agentType: "target-agent",
				contextKey: "shared-context",
				content: "shared knowledge",
				embedding: [0.1, 0.2, 0.3],
				createdAt: new Date(),
				lastAccessedAt: new Date(),
				accessCount: 1,
				metadata: { sharedFrom: "source-agent" },
				importance: 6, // Reduced from 7
			});

			const result = await memoryService.shareKnowledge(
				"source-agent",
				"target-agent",
				"shared-context",
				{ minImportance: 5 }
			);

			expect(result.shared).toBe(1);
			expect(result.errors).toBe(0);
			expect(storeSpy).toHaveBeenCalledWith(
				"target-agent",
				"shared-context",
				"shared knowledge",
				expect.objectContaining({
					importance: 6, // Adjusted down
					metadata: expect.objectContaining({
						sharedFrom: "source-agent",
					}),
				})
			);

			storeSpy.mockRestore();
		});
	});

	describe("getMemoryInsights", () => {
		beforeEach(async () => {
			await memoryService.initialize();
		});

		it("should generate memory insights", async () => {
			const mockDb = await import("@/db");

			// Mock context stats
			mockDb.db.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						groupBy: vi.fn().mockReturnValue({
							orderBy: vi.fn().mockReturnValue({
								limit: vi.fn().mockResolvedValue([
									{ contextKey: "best-practices", count: 10 },
									{ contextKey: "debugging", count: 5 },
								]),
							}),
						}),
					}),
				}),
			});

			// Mock importance stats
			mockDb.db.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						groupBy: vi.fn().mockResolvedValue([
							{ importance: 8, count: 3 },
							{ importance: 5, count: 7 },
						]),
					}),
				}),
			});

			// Mock growth stats
			mockDb.db.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						groupBy: vi.fn().mockReturnValue({
							orderBy: vi.fn().mockResolvedValue([
								{ date: "2024-01-01", count: 2 },
								{ date: "2024-01-02", count: 3 },
							]),
						}),
					}),
				}),
			});

			const insights = await memoryService.getMemoryInsights("test-agent");

			expect(insights).toBeDefined();
			expect(insights.frequentContexts).toHaveLength(2);
			expect(insights.frequentContexts[0].key).toBe("best-practices");
			expect(insights.importanceDistribution).toEqual({ 8: 3, 5: 7 });
			expect(insights.memoryGrowthTrend).toHaveLength(2);
			expect(insights.patterns).toContain('Most frequent context: "best-practices" (10 memories)');
		});
	});
});
