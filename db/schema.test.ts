import { migrationRunner } from "./migrations/migration-runner";
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
	workflows
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