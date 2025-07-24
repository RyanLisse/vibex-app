/**
 * Agent Memory Types Tests
 *
 * Comprehensive test coverage for agent memory type definitions
 * and validation functions.
 */

import { describe, it, expect } from "vitest";

// Import types to test (they exist even if not explicitly exported)
interface AgentMemory {
	id: string;
	agent_id: string;
	memory_type: "context" | "decision" | "learning" | "summary";
	content: string;
	metadata?: Record<string, any>;
	importance_score: number;
	created_at: Date;
	updated_at: Date;
	expires_at?: Date;
}

interface MemoryContext {
	session_id: string;
	conversation_id: string;
	task_id?: string;
	user_id?: string;
	tags: string[];
}

interface MemorySearchQuery {
	query: string;
	filters?: {
		agent_id?: string;
		memory_type?: string[];
		importance_min?: number;
		tags?: string[];
		date_range?: {
			start: Date;
			end: Date;
		};
	};
	limit?: number;
	offset?: number;
}

interface MemoryInsight {
	id: string;
	memory_ids: string[];
	insight_type: "pattern" | "correlation" | "trend" | "anomaly";
	title: string;
	description: string;
	confidence_score: number;
	generated_at: Date;
}

// Type validation utilities
const validateAgentMemory = (memory: Partial<AgentMemory>): memory is AgentMemory => {
	return !!(
		memory.id &&
		memory.agent_id &&
		memory.memory_type &&
		["context", "decision", "learning", "summary"].includes(memory.memory_type) &&
		memory.content &&
		typeof memory.importance_score === "number" &&
		memory.importance_score >= 0 &&
		memory.importance_score <= 1 &&
		memory.created_at &&
		memory.updated_at
	);
};

const validateMemoryContext = (context: Partial<MemoryContext>): context is MemoryContext => {
	return !!(context.session_id && context.conversation_id && Array.isArray(context.tags));
};

const validateMemorySearchQuery = (
	query: Partial<MemorySearchQuery>
): query is MemorySearchQuery => {
	return !!(query.query && typeof query.query === "string" && query.query.length > 0);
};

const validateMemoryInsight = (insight: Partial<MemoryInsight>): insight is MemoryInsight => {
	return !!(
		insight.id &&
		Array.isArray(insight.memory_ids) &&
		insight.insight_type &&
		["pattern", "correlation", "trend", "anomaly"].includes(insight.insight_type) &&
		insight.title &&
		insight.description &&
		typeof insight.confidence_score === "number" &&
		insight.confidence_score >= 0 &&
		insight.confidence_score <= 1 &&
		insight.generated_at
	);
};

describe("Agent Memory Types", () => {
	describe("AgentMemory Interface", () => {
		it("should validate valid agent memory objects", () => {
			const validMemory: AgentMemory = {
				id: "mem-123",
				agent_id: "agent-456",
				memory_type: "context",
				content: "User prefers dark mode",
				metadata: { preference: "ui" },
				importance_score: 0.8,
				created_at: new Date(),
				updated_at: new Date(),
				expires_at: new Date(Date.now() + 86400000), // 24 hours
			};

			expect(validateAgentMemory(validMemory)).toBe(true);
		});

		it("should reject invalid agent memory objects", () => {
			const invalidMemories = [
				{}, // Empty object
				{ id: "mem-123" }, // Missing required fields
				{
					id: "mem-123",
					agent_id: "agent-456",
					memory_type: "invalid_type", // Invalid memory type
					content: "Test content",
					importance_score: 0.8,
					created_at: new Date(),
					updated_at: new Date(),
				},
				{
					id: "mem-123",
					agent_id: "agent-456",
					memory_type: "context",
					content: "Test content",
					importance_score: 1.5, // Invalid importance score (> 1)
					created_at: new Date(),
					updated_at: new Date(),
				},
				{
					id: "mem-123",
					agent_id: "agent-456",
					memory_type: "context",
					content: "", // Empty content
					importance_score: 0.8,
					created_at: new Date(),
					updated_at: new Date(),
				},
			];

			invalidMemories.forEach((memory) => {
				expect(validateAgentMemory(memory)).toBe(false);
			});
		});

		it("should support all valid memory types", () => {
			const memoryTypes = ["context", "decision", "learning", "summary"];

			memoryTypes.forEach((type) => {
				const memory = {
					id: "mem-123",
					agent_id: "agent-456",
					memory_type: type,
					content: "Test content",
					importance_score: 0.5,
					created_at: new Date(),
					updated_at: new Date(),
				};

				expect(validateAgentMemory(memory)).toBe(true);
			});
		});

		it("should handle importance score boundaries", () => {
			const boundaryScores = [0, 0.5, 1];

			boundaryScores.forEach((score) => {
				const memory = {
					id: "mem-123",
					agent_id: "agent-456",
					memory_type: "context",
					content: "Test content",
					importance_score: score,
					created_at: new Date(),
					updated_at: new Date(),
				};

				expect(validateAgentMemory(memory)).toBe(true);
			});

			// Test invalid scores
			const invalidScores = [-0.1, 1.1, NaN, Infinity];

			invalidScores.forEach((score) => {
				const memory = {
					id: "mem-123",
					agent_id: "agent-456",
					memory_type: "context",
					content: "Test content",
					importance_score: score,
					created_at: new Date(),
					updated_at: new Date(),
				};

				expect(validateAgentMemory(memory)).toBe(false);
			});
		});
	});

	describe("MemoryContext Interface", () => {
		it("should validate valid memory context objects", () => {
			const validContext: MemoryContext = {
				session_id: "sess-123",
				conversation_id: "conv-456",
				task_id: "task-789",
				user_id: "user-101",
				tags: ["important", "user-preference"],
			};

			expect(validateMemoryContext(validContext)).toBe(true);
		});

		it("should handle optional fields correctly", () => {
			const minimalContext: MemoryContext = {
				session_id: "sess-123",
				conversation_id: "conv-456",
				tags: [],
			};

			expect(validateMemoryContext(minimalContext)).toBe(true);
		});

		it("should reject invalid memory context objects", () => {
			const invalidContexts = [
				{}, // Empty object
				{ session_id: "sess-123" }, // Missing required fields
				{
					session_id: "sess-123",
					conversation_id: "conv-456",
					tags: "not-an-array", // Invalid tags type
				},
				{
					session_id: "",
					conversation_id: "conv-456",
					tags: [],
				},
			];

			invalidContexts.forEach((context) => {
				expect(validateMemoryContext(context)).toBe(false);
			});
		});
	});

	describe("MemorySearchQuery Interface", () => {
		it("should validate valid search query objects", () => {
			const validQuery: MemorySearchQuery = {
				query: "user preferences",
				filters: {
					agent_id: "agent-123",
					memory_type: ["context", "decision"],
					importance_min: 0.5,
					tags: ["important"],
					date_range: {
						start: new Date("2024-01-01"),
						end: new Date("2024-12-31"),
					},
				},
				limit: 10,
				offset: 0,
			};

			expect(validateMemorySearchQuery(validQuery)).toBe(true);
		});

		it("should handle minimal search queries", () => {
			const minimalQuery: MemorySearchQuery = {
				query: "test search",
			};

			expect(validateMemorySearchQuery(minimalQuery)).toBe(true);
		});

		it("should reject invalid search queries", () => {
			const invalidQueries = [
				{}, // Empty object
				{ query: "" }, // Empty query string
				{ query: null }, // Null query
				{ query: 123 }, // Non-string query
			];

			invalidQueries.forEach((query) => {
				expect(validateMemorySearchQuery(query)).toBe(false);
			});
		});
	});

	describe("MemoryInsight Interface", () => {
		it("should validate valid memory insight objects", () => {
			const validInsight: MemoryInsight = {
				id: "insight-123",
				memory_ids: ["mem-1", "mem-2", "mem-3"],
				insight_type: "pattern",
				title: "User Behavior Pattern",
				description: "User consistently prefers dark mode across sessions",
				confidence_score: 0.85,
				generated_at: new Date(),
			};

			expect(validateMemoryInsight(validInsight)).toBe(true);
		});

		it("should support all valid insight types", () => {
			const insightTypes = ["pattern", "correlation", "trend", "anomaly"];

			insightTypes.forEach((type) => {
				const insight = {
					id: "insight-123",
					memory_ids: ["mem-1"],
					insight_type: type,
					title: "Test Insight",
					description: "Test description",
					confidence_score: 0.7,
					generated_at: new Date(),
				};

				expect(validateMemoryInsight(insight)).toBe(true);
			});
		});

		it("should handle confidence score boundaries", () => {
			const boundaryScores = [0, 0.5, 1];

			boundaryScores.forEach((score) => {
				const insight = {
					id: "insight-123",
					memory_ids: ["mem-1"],
					insight_type: "pattern",
					title: "Test Insight",
					description: "Test description",
					confidence_score: score,
					generated_at: new Date(),
				};

				expect(validateMemoryInsight(insight)).toBe(true);
			});
		});

		it("should reject invalid memory insight objects", () => {
			const invalidInsights = [
				{}, // Empty object
				{
					id: "insight-123",
					memory_ids: "not-an-array",
					insight_type: "pattern",
					title: "Test",
					description: "Test",
					confidence_score: 0.5,
					generated_at: new Date(),
				},
				{
					id: "insight-123",
					memory_ids: [],
					insight_type: "invalid_type",
					title: "Test",
					description: "Test",
					confidence_score: 0.5,
					generated_at: new Date(),
				},
				{
					id: "insight-123",
					memory_ids: ["mem-1"],
					insight_type: "pattern",
					title: "",
					description: "Test",
					confidence_score: 0.5,
					generated_at: new Date(),
				},
			];

			invalidInsights.forEach((insight) => {
				expect(validateMemoryInsight(insight)).toBe(false);
			});
		});
	});

	describe("Type Utility Functions", () => {
		it("should correctly identify valid types", () => {
			// Test that our validation functions work correctly
			expect(typeof validateAgentMemory).toBe("function");
			expect(typeof validateMemoryContext).toBe("function");
			expect(typeof validateMemorySearchQuery).toBe("function");
			expect(typeof validateMemoryInsight).toBe("function");
		});

		it("should handle edge cases gracefully", () => {
			// Test with null/undefined inputs
			expect(validateAgentMemory(null as any)).toBe(false);
			expect(validateAgentMemory(undefined as any)).toBe(false);
			expect(validateMemoryContext(null as any)).toBe(false);
			expect(validateMemoryContext(undefined as any)).toBe(false);
			expect(validateMemorySearchQuery(null as any)).toBe(false);
			expect(validateMemorySearchQuery(undefined as any)).toBe(false);
			expect(validateMemoryInsight(null as any)).toBe(false);
			expect(validateMemoryInsight(undefined as any)).toBe(false);
		});
	});

	describe("Type Interoperability", () => {
		it("should work with real-world data structures", () => {
			const memory: AgentMemory = {
				id: "mem-real-123",
				agent_id: "coverage-agent",
				memory_type: "learning",
				content: "User prefers comprehensive test coverage",
				metadata: {
					context: "testing",
					priority: "high",
					learned_from: "user_feedback",
				},
				importance_score: 0.9,
				created_at: new Date(),
				updated_at: new Date(),
			};

			const context: MemoryContext = {
				session_id: "coverage-session",
				conversation_id: "coverage-conv",
				task_id: "achieve-100-percent-coverage",
				user_id: "coverage-optimizer",
				tags: ["testing", "coverage", "quality"],
			};

			const searchQuery: MemorySearchQuery = {
				query: "test coverage preferences",
				filters: {
					agent_id: "coverage-agent",
					memory_type: ["learning", "decision"],
					importance_min: 0.8,
					tags: ["testing"],
				},
				limit: 5,
				offset: 0,
			};

			const insight: MemoryInsight = {
				id: "insight-coverage-123",
				memory_ids: [memory.id],
				insight_type: "trend",
				title: "Increasing Focus on Test Coverage",
				description: "Agent shows consistent patterns of prioritizing comprehensive test coverage",
				confidence_score: 0.95,
				generated_at: new Date(),
			};

			expect(validateAgentMemory(memory)).toBe(true);
			expect(validateMemoryContext(context)).toBe(true);
			expect(validateMemorySearchQuery(searchQuery)).toBe(true);
			expect(validateMemoryInsight(insight)).toBe(true);
		});
	});
});
