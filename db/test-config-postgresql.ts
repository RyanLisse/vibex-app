/**
 * PostgreSQL Test Database Configuration
 *
 * This module provides PostgreSQL-compatible database configuration and utilities for testing
 * Matches the production PostgreSQL schema with pg-core types
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

// Create PostgreSQL client for testing with proper connection handling
let testClient: Client | null = null;
let testDb: ReturnType<typeof drizzle> | null = null;

// Initialize PostgreSQL client and database connection
async function initializeDatabase() {
	if (testDb) return testDb;

	// Use test database URL or fallback to local PostgreSQL
	const connectionString =
		process.env.TEST_DATABASE_URL ||
		process.env.DATABASE_URL ||
		"postgresql://postgres:password@localhost:5432/vibex_test";

	testClient = new Client({
		connectionString,
		// Optimize for testing
		statement_timeout: 30000,
		query_timeout: 30000,
		connectionTimeoutMillis: 10000,
		idle_in_transaction_session_timeout: 30000,
	});

	await testClient.connect();
	testDb = drizzle(testClient, { schema });

	return testDb;
}

// Export database instance (lazy initialization)
export const getDb = async () => {
	return await initializeDatabase();
};

// Export raw SQL template for advanced queries
export { sql };

/**
 * Database connection health check for tests
 * @returns Promise<boolean> - true if database is accessible
 */
export async function checkDatabaseHealth(): Promise<boolean> {
	try {
		const db = await getDb();
		const result = await db.execute(sql`SELECT 1 as health_check`);
		return result.length > 0;
	} catch (error) {
		console.warn("Database health check failed:", error);
		return false;
	}
}

/**
 * Initialize database extensions and schema for testing
 * For PostgreSQL, this ensures vector extension and proper schema
 * @returns Promise<void>
 */
export async function initializeExtensions(): Promise<void> {
	try {
		const db = await getDb();

		// Enable required extensions for PostgreSQL
		await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
		await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "vector"`);
		await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "btree_gin"`);

		// Run any pending migrations
		// Note: This would typically run the migration runner here
	} catch (error) {
		console.warn("Extension initialization failed:", error);
		// Continue silently for testing
	}
}

/**
 * Clean up database connection for test teardown
 * @returns Promise<void>
 */
export async function closeDatabaseConnection(): Promise<void> {
	try {
		if (testClient) {
			await testClient.end();
			testClient = null;
			testDb = null;
		}
	} catch (error) {
		console.warn("Database cleanup error:", error);
	}
}

/**
 * Reset database to clean state for test isolation
 * Truncates all tables while preserving schema
 * @returns Promise<void>
 */
export async function resetDatabase(): Promise<void> {
	try {
		const db = await getDb();

		// Truncate all tables in correct order (respecting foreign key constraints)
		const truncateQueries = [
			// Child tables first (those with foreign keys)
			"execution_snapshots",
			"observability_events",
			"agent_executions",
			"workflow_executions",
			"agent_memory",
			"alert_notifications",
			"github_branches",
			"auth_sessions",
			"file_uploads",
			"agent_sessions",
			"auth_tokens",

			// Parent tables
			"tasks",
			"environments",
			"workflows",
			"users",
			"github_repositories",
			"alerts",
			"alert_channels",
			"alert_metrics",
			"migrations",
		];

		// Disable triggers temporarily for faster truncation
		await db.execute(sql`SET session_replication_role = replica`);

		for (const table of truncateQueries) {
			try {
				await db.execute(sql.raw(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`));
			} catch (error) {
				// Table might not exist yet, continue
				console.warn(`Failed to truncate ${table}:`, error);
			}
		}

		// Re-enable triggers
		await db.execute(sql`SET session_replication_role = DEFAULT`);
	} catch (error) {
		console.warn("Database reset failed:", error);
	}
}

/**
 * Seed database with test data
 * @returns Promise<void>
 */
export async function seedTestData(): Promise<void> {
	try {
		const db = await getDb();

		// Insert test users
		await db.execute(sql`
      INSERT INTO users (id, email, name, provider, provider_id, is_active)
      VALUES 
        ('test-user-1', 'test1@example.com', 'Test User 1', 'github', 'github-123', true),
        ('test-user-2', 'test2@example.com', 'Test User 2', 'github', 'github-456', true)
      ON CONFLICT (email) DO NOTHING
    `);

		// Insert test tasks
		await db.execute(sql`
      INSERT INTO tasks (id, title, description, status, priority, user_id, metadata)
      VALUES 
        ('test-task-1', 'Test Task 1', 'First test task', 'pending', 'high', 'test-user-1', '{"test": true}'),
        ('test-task-2', 'Test Task 2', 'Second test task', 'completed', 'medium', 'test-user-2', '{"test": true}')
      ON CONFLICT (id) DO NOTHING
    `);

		// Insert test environments
		await db.execute(sql`
      INSERT INTO environments (id, name, config, user_id, is_active)
      VALUES 
        ('test-env-1', 'Test Environment 1', '{"key": "value"}', 'test-user-1', true),
        ('test-env-2', 'Test Environment 2', '{"key": "value2"}', 'test-user-2', true)
      ON CONFLICT (id) DO NOTHING
    `);
	} catch (error) {
		console.warn("Database seeding failed:", error);
	}
}

/**
 * Database configuration info for testing
 */
export const getTestDatabaseInfo = () => ({
	environment: "test",
	isTestMode: true,
	databaseType: "postgresql",
	connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
	maxConnections: 10,
	clientType: "node-postgres",
});

/**
 * Execute raw SQL with proper error handling for tests
 * @param query - SQL query string
 * @param params - Query parameters
 * @returns Promise<any>
 */
export async function executeTestQuery(query: string, params?: any[]): Promise<any> {
	try {
		const db = await getDb();
		if (params && params.length > 0) {
			return await db.execute(sql.raw(query, params));
		} else {
			return await db.execute(sql.raw(query));
		}
	} catch (error) {
		throw new Error(
			`Test query execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
		);
	}
}

/**
 * Get test database statistics for monitoring
 * @returns object with database stats
 */
export async function getTestDatabaseStats() {
	try {
		const db = await getDb();

		const stats = await Promise.all([
			db.execute(sql`SELECT COUNT(*) as count FROM users`),
			db.execute(sql`SELECT COUNT(*) as count FROM tasks`),
			db.execute(sql`SELECT COUNT(*) as count FROM environments`),
			db.execute(sql`SELECT COUNT(*) as count FROM workflows`),
			db.execute(sql`SELECT COUNT(*) as count FROM agent_executions`),
		]);

		return {
			users: stats[0][0],
			tasks: stats[1][0],
			environments: stats[2][0],
			workflows: stats[3][0],
			executions: stats[4][0],
		};
	} catch (error) {
		return { error: error instanceof Error ? error.message : "Unknown error" };
	}
}

// Export database instance for direct access (use getDb() for lazy loading)
export const db = new Proxy({} as any, {
	get: (target, prop) => {
		throw new Error("Use getDb() instead of accessing db directly for proper initialization");
	},
});

// Export client access for cleanup operations
export const getClient = () => testClient;
