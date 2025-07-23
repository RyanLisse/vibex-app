/**
 * Database Configuration
 *
 * Provides database connection and configuration for the application
 * This is a stub implementation for build purposes
 */

// Stub database implementation for build purposes
export const db = {
	select: () => ({
		from: (table: any) => {
			const queryResult = {
				where: (condition: any) => ({
					limit: (count: any) => Promise.resolve([]),
					orderBy: (...args: any[]) => ({
						limit: (count: any) => Promise.resolve([]),
					}),
					filter: (fn: any) => Promise.resolve([]),
				}),
				limit: (count: any) => Promise.resolve([]),
				orderBy: (...args: any[]) => ({
					limit: (count: any) => Promise.resolve([]),
					where: (condition: any) => ({
						limit: (count: any) => Promise.resolve([]),
					}),
				}),
				filter: (fn: any) => Promise.resolve([]),
				length: 0,
			};
			// Make the query result promise-like and add array-like properties
			const result = Object.assign(Promise.resolve([]), queryResult);
			result.length = 0;
			result.filter = (fn: any) => Promise.resolve([]);
			return result;
		},
	}),
	insert: (table: any) => ({
		values: (data: any) => ({
			returning: () => Promise.resolve([data]),
			onConflictDoUpdate: (config: any) => ({
				returning: () => Promise.resolve([data]),
			}),
		}),
	}),
	update: (table: any) => ({
		set: (data: any) => ({
			where: (condition: any) => ({
				returning: () => Promise.resolve([data]),
			}),
		}),
	}),
	delete: (table: any) => ({
		where: (condition: any) => ({
			returning: () => Promise.resolve([]),
		}),
	}),
	execute: async (query?: any) => ({ rows: [], rowCount: 0 }),
	query: {
		users: {
			findFirst: () => null,
			findMany: () => [],
		},
		authSessions: {
			findFirst: () => null,
			findMany: () => [],
		},
		githubRepositories: {
			findFirst: () => null,
			findMany: () => [],
		},
		tasks: {
			findFirst: () => null,
			findMany: () => [],
		},
		environments: {
			findFirst: () => null,
			findMany: () => [],
		},
		observabilityEvents: {
			findFirst: () => null,
			findMany: () => [],
		},
	},
};

// Stub client for compatibility
export const client = {
	end: async () => {},
};

// Database connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
	// Always return true for stub implementation
	return true;
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
	// No-op for stub implementation
}
