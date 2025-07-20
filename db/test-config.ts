/**
 * Test Database Configuration
 *
 * This module provides mocked database instances for testing
 */

<<<<<<< HEAD
import { vi } from "vitest";

// Create a mock database instance
const createMockDb = () => {
	const mockDb: any = {
		select: vi.fn(() => mockDb),
		from: vi.fn(() => mockDb),
		where: vi.fn(() => mockDb),
		orderBy: vi.fn(() => mockDb),
		limit: vi.fn(() => mockDb),
		insert: vi.fn(() => mockDb),
		values: vi.fn(() => mockDb),
		update: vi.fn(() => mockDb),
		set: vi.fn(() => mockDb),
		delete: vi.fn(() => mockDb),
		execute: vi.fn().mockResolvedValue([]),
		returning: vi.fn().mockResolvedValue([]),
	};

	// Make limit return a promise
	mockDb.limit = vi.fn().mockResolvedValue([]);

	return mockDb;
};

// Mock SQL function
const mockSql = vi.fn().mockImplementation(async () => {
	return [{ "?column?": 1 }];
});

// Export mocked instances
export const db = createMockDb();
export const sql = mockSql;

// Mock health check
export async function checkDatabaseHealth(): Promise<boolean> {
	return true;
=======
import { vi } from 'vitest'

// Create a mock database instance
const createMockDb = () => {
  const mockDb: any = {
    select: vi.fn(() => mockDb),
    from: vi.fn(() => mockDb),
    where: vi.fn(() => mockDb),
    orderBy: vi.fn(() => mockDb),
    limit: vi.fn(() => mockDb),
    insert: vi.fn(() => mockDb),
    values: vi.fn(() => mockDb),
    update: vi.fn(() => mockDb),
    set: vi.fn(() => mockDb),
    delete: vi.fn(() => mockDb),
    execute: vi.fn().mockResolvedValue([]),
    returning: vi.fn().mockResolvedValue([]),
  }

  // Make limit return a promise
  mockDb.limit = vi.fn().mockResolvedValue([])

  return mockDb
}

// Mock SQL function
const mockSql = vi.fn().mockImplementation(async () => {
  return [{ '?column?': 1 }]
})

// Export mocked instances
export const db = createMockDb()
export const sql = mockSql

// Mock health check
export async function checkDatabaseHealth(): Promise<boolean> {
  return true
>>>>>>> merge-pr-21
}

// Mock database configuration
export const dbConfig = {
<<<<<<< HEAD
	connectionString: "postgresql://test:test@localhost:5432/test",
	ssl: false,
	maxConnections: 20,
	idleTimeout: 30_000,
	connectionTimeout: 10_000,
};

// Mock pool
export class DatabasePool {
	static instance = new DatabasePool();

	static getInstance() {
		return DatabasePool.instance;
	}

	async getConnection() {
		return sql;
	}

	releaseConnection() {}

	getConnectionCount() {
		return 0;
	}

	getMaxConnections() {
		return 20;
	}

	isConnectionPoolHealthy() {
		return true;
	}

	getLastHealthCheck() {
		return new Date();
	}

	getPoolStats() {
		return {
			activeConnections: 0,
			maxConnections: 20,
			utilizationPercent: 0,
			isHealthy: true,
			lastHealthCheck: new Date(),
		};
	}

	destroy() {}
=======
  connectionString: 'postgresql://test:test@localhost:5432/test',
  ssl: false,
  maxConnections: 20,
  idleTimeout: 30_000,
  connectionTimeout: 10_000,
}

// Mock pool
export class DatabasePool {
  static instance = new DatabasePool()

  static getInstance() {
    return DatabasePool.instance
  }

  async getConnection() {
    return sql
  }

  releaseConnection() {}

  getConnectionCount() {
    return 0
  }

  getMaxConnections() {
    return 20
  }

  isConnectionPoolHealthy() {
    return true
  }

  getLastHealthCheck() {
    return new Date()
  }

  getPoolStats() {
    return {
      activeConnections: 0,
      maxConnections: 20,
      utilizationPercent: 0,
      isHealthy: true,
      lastHealthCheck: new Date(),
    }
  }

  destroy() {}
>>>>>>> merge-pr-21
}

// Mock monitor
export class DatabaseMonitor {
<<<<<<< HEAD
	static instance = new DatabaseMonitor();

	static getInstance() {
		return DatabaseMonitor.instance;
	}

	recordQuery() {}
	recordError() {}

	getMetrics() {
		return {
			queryCount: 0,
			errorCount: 0,
			averageResponseTime: 0,
			errorRate: 0,
			slowQueries: [],
		};
	}

	resetMetrics() {}
=======
  static instance = new DatabaseMonitor()

  static getInstance() {
    return DatabaseMonitor.instance
  }

  recordQuery() {}
  recordError() {}

  getMetrics() {
    return {
      queryCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      slowQueries: [],
    }
  }

  resetMetrics() {}
>>>>>>> merge-pr-21
}

export async function initializeExtensions() {}

<<<<<<< HEAD
export default db;
=======
export default db
>>>>>>> merge-pr-21
