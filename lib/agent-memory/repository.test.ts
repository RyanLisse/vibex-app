/**
 * Memory Repository Tests
 */

import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/config";
import { MemoryRepository } from "./repository";
import type { CreateMemoryInput, MemoryEntry } from "./types";

// Mock database
vi.mock("@/db/config", () => ({
	db: {
		insert: vi.fn(),
		update: vi.fn(),
		select: vi.fn(),
		delete: vi.fn(),
	},
}));

// Mock ulid
vi.mock("ulid", () => ({
	ulid: () => "test-ulid-123",
}));

describe("MemoryRepository", () => {
	let repository: MemoryRepository;
	let mockDb: any;

	beforeEach(() => {
		vi.clearAllMocks();
		repository = new MemoryRepository();
		mockDb = db as any;

		// Setup default mock chains
		mockDb.insert.mockReturnValue({
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([
					{
						id: "test-id",
						agentType: "test-agent",
						contextKey: "test-context",
						content: "Test content",
						embedding: null,
						metadata: {},
						importance: 5,
						createdAt: new Date(),
						lastAccessedAt: new Date(),
						accessCount: 0,
						expiresAt: null,
					},
				]),
			}),
		});

		mockDb.update.mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([
						{
							id: "test-id",
							agentType: "test-agent",
							contextKey: "test-context",
							content: "Updated content",
							embedding: null,
							metadata: {},
							importance: 7,
							createdAt: new Date(),
							lastAccessedAt: new Date(),
							accessCount: 1,
							expiresAt: null,
						},
					]),
				}),
			}),
		});

		mockDb.select.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockReturnValue({
						limit: vi.fn().mockReturnValue({
							offset: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
				limit: vi.fn().mockResolvedValue([]),
			}),
		});

		mockDb.delete.mockReturnValue({
			where: vi.fn().mockResolvedValue({ rowCount: 1 }),
		});
	});

	describe("create", () => {
		it("should create a new memory entry", async () => {
			const input: CreateMemoryInput = {
				agentType: "test-agent",
				contextKey: "test-context",
				content: "Test memory content",
				metadata: {
					type: "knowledge_base",
					source: "test",
					confidence: 0.9,
					tags: ["test"],
					context: {},
					relatedMemories: [],
					accessPattern: "recent",
				},
				importance: 5,
			};

			const result = await repository.create(input);

			expect(mockDb.insert).toHaveBeenCalled();
			expect(result).toHaveProperty("id", "test-id");
			expect(result).toHaveProperty("agentType", "test-agent");
			expect(result).toHaveProperty("content", "Test content");
		});
	});

	describe("findById", () => {
		it("should find memory by ID", async () => {
			const mockMemory = {
				id: "test-id",
				agentType: "test-agent",
				contextKey: "test-context",
				content: "Test content",
				embedding: null,
				metadata: {},
				importance: 5,
				createdAt: new Date(),
				lastAccessedAt: new Date(),
				accessCount: 0,
				expiresAt: null,
			};

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockMemory]),
					}),
				}),
			});

			const result = await repository.findById("test-id");

			expect(result).toBeTruthy();
			expect(result?.id).toBe("test-id");
		});

		it("should return null if memory not found", async () => {
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			});

			const result = await repository.findById("non-existent");

			expect(result).toBeNull();
		});
	});

	describe("update", () => {
		it("should update memory entry", async () => {
			const updates = {
				content: "Updated content",
				importance: 7 as const,
			};

			const result = await repository.update("test-id", updates);

			expect(mockDb.update).toHaveBeenCalled();
			expect(result).toBeTruthy();
			expect(result?.content).toBe("Updated content");
			expect(result?.importance).toBe(7);
		});

		it("should handle metadata updates", async () => {
			const updates = {
				metadata: {
					tags: ["updated", "test"],
				},
			};

			await repository.update("test-id", updates);

			const updateCall = mockDb.update.mock.calls[0];
			expect(updateCall).toBeTruthy();
		});
	});

	describe("search", () => {
		it("should search with agent type filter", async () => {
			const mockResults = [
				{
					id: "test-1",
					agentType: "test-agent",
					content: "Memory 1",
				},
			];

			// Create a mock query that can be awaited
			const mockQuery = {
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockReturnThis(),
				then: (resolve: any) => resolve(mockResults),
			};

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue(mockQuery),
			});

			const results = await repository.search({
				agentType: "test-agent",
				limit: 10,
			});

			expect(results).toHaveLength(1);
			expect(mockQuery.where).toHaveBeenCalled();
		});

		it("should search with importance range", async () => {
			// Create a mock query that can be awaited
			const mockQuery = {
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockReturnThis(),
				then: (resolve: any) => resolve([]),
			};

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue(mockQuery),
			});

			await repository.search({
				importance: { min: 5, max: 8 },
			});

			expect(mockDb.select).toHaveBeenCalled();
		});

		it("should exclude expired memories by default", async () => {
			// Create a mock query that can be awaited
			const mockQuery = {
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockReturnThis(),
				then: (resolve: any) => resolve([]),
			};

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue(mockQuery),
			});

			await repository.search({});

			const selectCall = mockDb.select.mock.calls[0];
			expect(selectCall).toBeTruthy();
		});
	});

	describe("updateAccess", () => {
		it("should update access count and timestamp", async () => {
			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue({ rowCount: 2 }),
				}),
			});

			await repository.updateAccess(["id1", "id2"]);

			expect(mockDb.update).toHaveBeenCalled();
			const setCall = mockDb.update().set.mock.calls[0][0];
			expect(setCall).toHaveProperty("lastAccessedAt");
			expect(setCall).toHaveProperty("accessCount");
		});

		it("should handle empty array", async () => {
			await repository.updateAccess([]);

			expect(mockDb.update).not.toHaveBeenCalled();
		});
	});

	describe("archiveOldMemories", () => {
		it("should archive memories older than specified days", async () => {
			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue({ rowCount: 5 }),
				}),
			});

			const result = await repository.archiveOldMemories("test-agent", 30);

			expect(result).toBe(5);
			expect(mockDb.update).toHaveBeenCalled();
		});
	});

	describe("deleteExpired", () => {
		it("should delete expired memories", async () => {
			mockDb.delete.mockReturnValue({
				where: vi.fn().mockResolvedValue({ rowCount: 3 }),
			});

			const result = await repository.deleteExpired();

			expect(result).toBe(3);
			expect(mockDb.delete).toHaveBeenCalled();
		});
	});

	describe("getStats", () => {
		it("should return memory statistics", async () => {
			const mockStats = {
				totalCount: 100,
				averageImportance: 5.5,
				averageAccessCount: 3.2,
				storageSize: 1_024_000,
			};

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([mockStats]),
				}),
			});

			const result = await repository.getStats("test-agent");

			expect(result).toEqual(mockStats);
		});

		it("should handle no results", async () => {
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([null]),
				}),
			});

			const result = await repository.getStats();

			expect(result).toEqual({
				totalCount: 0,
				averageImportance: 0,
				averageAccessCount: 0,
				storageSize: 0,
			});
		});
	});
});
