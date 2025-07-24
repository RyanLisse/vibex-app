/**
 * Real Database Test Configuration
 *
 * Provides actual database connections for integration testing
 * This replaces the mock implementation when DATABASE_URL is available
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Database connection pool for tests
let pool: Pool | null = null;
let db: any = null;

/**
 * Initialize database connection for testing
 */
export async function initializeTestDatabase() {
	if (db) return db;

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is required for integration tests");
	}

	try {
		// Create connection pool
		pool = new Pool({
			connectionString: databaseUrl,
			max: 5, // Limit connections for tests
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 5000,
		});

		// Test connection
		await pool.query("SELECT 1");

		// Initialize Drizzle with schema
		db = drizzle(pool, { schema });

		return db;
	} catch (error) {
		throw error;
	}
}

/**
 * Get database instance for tests
 */
export function getTestDatabase() {
	if (!db) {
		throw new Error("Test database not initialized. Call initializeTestDatabase() first.");
	}
	return db;
}

/**
 * Database health check for tests
 */
export async function checkDatabaseHealth(): Promise<boolean> {
	try {
		if (!pool) {
			await initializeTestDatabase();
		}

		const result = await pool!.query("SELECT 1 as health");
		return result.rows.length > 0 && result.rows[0].health === 1;
	} catch (error) {
		return false;
	}
}

/**
 * Clean up database connections
 */
export async function closeDatabaseConnection(): Promise<void> {
	try {
		if (pool) {
			await pool.end();
		}
	} catch (error) {
		// Silent cleanup
	} finally {
		pool = null;
		db = null;
	}
}

/**
 * Setup test database tables if needed
 */
export async function setupTestTables(): Promise<void> {
	const testDb = await initializeTestDatabase();

	try {
		// Create basic tables needed for integration tests
		await testDb.execute(`
      CREATE TABLE IF NOT EXISTS test_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

		await testDb.execute(`
      CREATE TABLE IF NOT EXISTS test_tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        user_id INTEGER REFERENCES test_users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
	} catch (error) {
		throw error;
	}
}

/**
 * Clean test data between tests
 */
export async function cleanTestData(): Promise<void> {
	const testDb = await initializeTestDatabase();

	try {
		// Clean test data in proper order (respect foreign keys)
		await testDb.execute("DELETE FROM test_tasks");
		await testDb.execute("DELETE FROM test_users");
	} catch (error) {
		throw error;
	}
}

// Export the database connection for direct use in tests
export { db as testDb };
