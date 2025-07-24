/**
 * Database Connection and Exports
 * Production database layer with Neon serverless PostgreSQL
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// Environment validation
const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL or NEON_DATABASE_URL environment variable is required");
}

// Create Neon serverless client
const neonClient = neon(databaseUrl);

// Create Drizzle database instance with schema
export const db = drizzle(neonClient, { schema });

// Re-export all schema elements for convenient access
export * from "./schema";

// Database utilities
export async function getDatabaseHealth(): Promise<{
	connected: boolean;
	latency?: number;
	error?: string;
}> {
	const start = Date.now();
	try {
		await neonClient("SELECT 1");
		return {
			connected: true,
			latency: Date.now() - start,
		};
	} catch (error) {
		return {
			connected: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

// Database connection pool management
export class DatabasePool {
	private static instance: DatabasePool;

	static getInstance(): DatabasePool {
		if (!DatabasePool.instance) {
			DatabasePool.instance = new DatabasePool();
		}
		return DatabasePool.instance;
	}

	async healthCheck(): Promise<boolean> {
		const health = await getDatabaseHealth();
		return health.connected;
	}

	async close(): Promise<void> {
		// Neon serverless handles connection cleanup automatically
	}
}

// Initialize database extensions
export async function initializeExtensions(): Promise<void> {
	try {
		// Enable required PostgreSQL extensions
		await neonClient("CREATE EXTENSION IF NOT EXISTS vector");
		await neonClient("CREATE EXTENSION IF NOT EXISTS pg_trgm");
		await neonClient('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
	} catch (error) {
		console.error("Failed to initialize database extensions:", error);
		throw error;
	}
}

// Database health check function
export async function checkDatabaseHealth(): Promise<boolean> {
	const health = await getDatabaseHealth();
	return health.connected;
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
	const pool = DatabasePool.getInstance();
	await pool.close();
}

// Database client export for compatibility
export const client = {
	end: closeDatabaseConnection,
};

// Process exit handlers for graceful shutdown
if (typeof process !== "undefined") {
	process.on("SIGINT", closeDatabaseConnection);
	process.on("SIGTERM", closeDatabaseConnection);
	process.on("exit", closeDatabaseConnection);
}
