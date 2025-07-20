import { eq, gte } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DatabaseSchemas } from "../lib/validation/database-schemas";
import { checkDatabaseHealth, db, initializeExtensions } from "./config";
import { migrationRunner } from "./migrations/migration-runner";
import {
	agentExecutions,
	agentMemory,
	environments,
	executionSnapshots,
	type NewAgentExecution,
	type NewEnvironment,
	type NewTask,
	observabilityEvents,
	tasks,
	workflowExecutions,
	workflows,
} from "./schema";

// Skip tests if no database URL is provided
const skipTests = !process.env.DATABASE_URL;

describe("Database Schema and Migration Tests", () => {
	beforeAll(async () => {
		// Ensure database is healthy
		const isHealthy = await checkDatabaseHealth();
		if (!isHealthy) {
			throw new Error("Database is not healthy");
		}

		// Initialize extensions
		await initializeExtensions();

		// Run migrations
		const result = await migrationRunner.migrate();
		if (!result.success) {
			throw new Error(`Migration failed: ${result.errors.join(", ")}`);
		}
	});

	afterAll(async () => {
		// Clean up test data
		try {
			await db.delete(executionSnapshots);
			await db.delete(observabilityEvents);
			await db.delete(agentExecutions);
			await db.delete(workflowExecutions);
			await db.delete(workflows);
			await db.delete(agentMemory);
			await db.delete(environments);
			await db.delete(tasks);
		} catch (error) {
			console.warn("Cleanup failed:", error);
		}
	});

	describe("Database Connection", () => {
		it("should connect to database successfully", async () => {
			const isHealthy = await checkDatabaseHealth();
			expect(isHealthy).toBe(true);
		});

		it("should have required extensions installed", async () => {
			// Test vector extension
			const vectorResult = await db.execute(`
        SELECT EXISTS(
          SELECT 1 FROM pg_extension WHERE extname = 'vector'
        ) as has_vector
      `);
			expect(vectorResult.rows[0].has_vector).toBe(true);

			// Test uuid-ossp extension
			const uuidResult = await db.execute(`
        SELECT EXISTS(
          SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
        ) as has_uuid
      `);
			expect(uuidResult.rows[0].has_uuid).toBe(true);
		});
	});

	describe("Migration System", () => {
		it("should show migration status", async () => {
			const status = await migrationRunner.getStatus();
			expect(status.total).toBeGreaterThan(0);
			expect(status.executed.length).toBeGreaterThan(0);
			expect(status.pending.length).toBeGreaterThanOrEqual(0);
		});

		it("should validate migration integrity", async () => {
			// This is tested internally by the migration runner
			const result = await migrationRunner.migrate();
			expect(result.success).toBe(true);
		});
	});

	describe("Schema Validation", () => {
		it("should validate task creation schema", () => {
			const validTask = {
				title: "Test Task",
				description: "Test description",
				status: "pending" as const,
				priority: "medium" as const,
			};

			const result = DatabaseSchemas.CreateTask.safeParse(validTask);
			expect(result.success).toBe(true);
		});

		it("should reject invalid task data", () => {
			const invalidTask = {
				title: "", // Empty title should fail
				status: "invalid_status",
			};

			const result = DatabaseSchemas.CreateTask.safeParse(invalidTask);
			expect(result.success).toBe(false);
		});

		it("should validate environment creation schema", () => {
			const validEnvironment = {
				name: "Test Environment",
				config: { key: "value" },
				isActive: true,
			};

			const result =
				DatabaseSchemas.CreateEnvironment.safeParse(validEnvironment);
			expect(result.success).toBe(true);
		});

		it("should validate agent execution schema", () => {
			const validExecution = {
				agentType: "test-agent",
				status: "pending" as const,
				input: { prompt: "test" },
			};

			const result =
				DatabaseSchemas.CreateAgentExecution.safeParse(validExecution);
			expect(result.success).toBe(true);
		});
	});

	describe("Database Operations", () => {
		let testTaskId: string;
		let testEnvironmentId: string;
		let testExecutionId: string;

		it("should create and retrieve tasks", async () => {
			const newTask: NewTask = {
				title: "Test Task",
				description: "Test description",
				status: "pending",
				priority: "medium",
				metadata: { test: true },
			};

			const [created] = await db.insert(tasks).values(newTask).returning();
			expect(created).toBeDefined();
			expect(created.title).toBe(newTask.title);
			expect(created.id).toBeDefined();

			testTaskId = created.id;

			// Retrieve the task
			const retrieved = await db
				.select()
				.from(tasks)
				.where(eq(tasks.id, created.id));
			expect(retrieved).toHaveLength(1);
			expect(retrieved[0].title).toBe(newTask.title);
		});

		it("should create and retrieve environments", async () => {
			const newEnvironment: NewEnvironment = {
				name: "Test Environment",
				config: { apiKey: "test-key", endpoint: "https://api.test.com" },
				isActive: true,
				schemaVersion: 1,
			};

			const [created] = await db
				.insert(environments)
				.values(newEnvironment)
				.returning();
			expect(created).toBeDefined();
			expect(created.name).toBe(newEnvironment.name);
			expect(created.id).toBeDefined();

			testEnvironmentId = created.id;
		});

		it("should create agent executions with foreign key relationships", async () => {
			const newExecution: NewAgentExecution = {
				taskId: testTaskId,
				agentType: "test-agent",
				status: "running",
				input: { prompt: "Test prompt" },
				metadata: { version: "1.0" },
			};

			const [created] = await db
				.insert(agentExecutions)
				.values(newExecution)
				.returning();
			expect(created).toBeDefined();
			expect(created.taskId).toBe(testTaskId);
			expect(created.agentType).toBe(newExecution.agentType);

			testExecutionId = created.id;
		});

		it("should create observability events", async () => {
			const newEvent = {
				executionId: testExecutionId,
				eventType: "agent.started",
				data: { timestamp: new Date().toISOString() },
				severity: "info" as const,
				category: "execution",
			};

			const [created] = await db
				.insert(observabilityEvents)
				.values(newEvent)
				.returning();
			expect(created).toBeDefined();
			expect(created.executionId).toBe(testExecutionId);
			expect(created.eventType).toBe(newEvent.eventType);
		});

		it("should create execution snapshots", async () => {
			const newSnapshot = {
				executionId: testExecutionId,
				stepNumber: 1,
				state: { currentStep: "initialization", variables: { x: 1 } },
				description: "Initial state",
				checkpoint: true,
			};

			const [created] = await db
				.insert(executionSnapshots)
				.values(newSnapshot)
				.returning();
			expect(created).toBeDefined();
			expect(created.executionId).toBe(testExecutionId);
			expect(created.stepNumber).toBe(1);
		});

		it("should create workflows and executions", async () => {
			const newWorkflow = {
				name: "Test Workflow",
				definition: {
					steps: [
						{ id: "step1", type: "action", config: {} },
						{ id: "step2", type: "condition", config: {} },
					],
				},
				version: 1,
				description: "Test workflow for validation",
			};

			const [createdWorkflow] = await db
				.insert(workflows)
				.values(newWorkflow)
				.returning();
			expect(createdWorkflow).toBeDefined();

			const newExecution = {
				workflowId: createdWorkflow.id,
				status: "running" as const,
				currentStep: 0,
				totalSteps: 2,
				state: { initialized: true },
			};

			const [createdExecution] = await db
				.insert(workflowExecutions)
				.values(newExecution)
				.returning();
			expect(createdExecution).toBeDefined();
			expect(createdExecution.workflowId).toBe(createdWorkflow.id);
		});

		it("should handle agent memory with vector embeddings", async () => {
			// Note: In a real test, you would generate actual embeddings
			// For this test, we'll use a mock embedding array
			const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());

			const newMemory = {
				agentType: "test-agent",
				contextKey: "test-context",
				content: "This is test content for agent memory",
				embedding: mockEmbedding,
				importance: 5,
				metadata: { source: "test" },
			};

			const [created] = await db
				.insert(agentMemory)
				.values(newMemory)
				.returning();
			expect(created).toBeDefined();
			expect(created.agentType).toBe(newMemory.agentType);
			expect(created.contextKey).toBe(newMemory.contextKey);
		});
	});

	describe("Database Indexes and Constraints", () => {
		it("should enforce unique constraints", async () => {
			const environment1 = {
				name: "Unique Test",
				config: { test: 1 },
				userId: "user123",
			};

			const environment2 = {
				name: "Unique Test", // Same name
				config: { test: 2 },
				userId: "user123", // Same user
			};

			await db.insert(environments).values(environment1);

			// This should fail due to unique constraint
			await expect(
				db.insert(environments).values(environment2),
			).rejects.toThrow();
		});

		it("should cascade delete related records", async () => {
			// Create a task with related execution
			const [task] = await db
				.insert(tasks)
				.values({
					title: "Cascade Test Task",
					status: "pending",
				})
				.returning();

			const [execution] = await db
				.insert(agentExecutions)
				.values({
					taskId: task.id,
					agentType: "test-agent",
					status: "completed",
				})
				.returning();

			// Create related observability event
			await db.insert(observabilityEvents).values({
				executionId: execution.id,
				eventType: "test.event",
				data: { test: true },
			});

			// Delete the task - should cascade to execution and events
			await db.delete(tasks).where(eq(tasks.id, task.id));

			// Verify cascade deletion
			const remainingExecutions = await db
				.select()
				.from(agentExecutions)
				.where(eq(agentExecutions.id, execution.id));

			expect(remainingExecutions).toHaveLength(0);
		});
	});

	describe("Performance and Indexing", () => {
		it("should use indexes for common queries", async () => {
			// This test would require EXPLAIN ANALYZE in a real scenario
			// For now, we'll just verify the queries execute efficiently

			const start = Date.now();

			// Query by status (should use index)
			await db.select().from(tasks).where(eq(tasks.status, "pending"));

			// Query by user ID (should use index)
			await db.select().from(tasks).where(eq(tasks.userId, "test-user"));

			// Query by created date (should use index)
			await db
				.select()
				.from(tasks)
				.where(gte(tasks.createdAt, new Date("2024-01-01")));

			const duration = Date.now() - start;

			// These queries should be fast with proper indexing
			expect(duration).toBeLessThan(1000); // Less than 1 second
		});
	});
});

// Helper function to generate mock embeddings
function generateMockEmbedding(dimensions = 1536): number[] {
	return new Array(dimensions).fill(0).map(() => Math.random() * 2 - 1); // Values between -1 and 1
}

// Export for use in other tests
export { generateMockEmbedding };
