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
			// Return a proper array with query methods
			const result: any[] = [];
			result.where = (condition: any) => {
				const filteredResult: any[] = [];
				filteredResult.limit = (count: any) => [];
				return filteredResult;
			};
			result.limit = (count: any) => [];
			return result;
		},
	}),
	insert: (table: any) => ({
		values: (data: any) => ({
			returning: () => [data],
		}),
	}),
	update: (table: any) => ({
		set: (data: any) => ({
			where: (condition: any) => ({
				returning: () => [data],
			}),
		}),
	}),
	delete: (table: any) => ({
		where: (condition: any) => ({
			returning: () => [],
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
