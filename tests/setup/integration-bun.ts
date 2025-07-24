/**
 * Bun-compatible Integration Test Setup
 * This file provides mocks and setup for integration tests running in Bun runtime
 * which doesn't support vi.mock at module level like Node.js Vitest
 */

// CRITICAL: Import crypto polyfill FIRST to ensure crypto.randomUUID() availability
import "./crypto-polyfill";

import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";

// Global test environment setup
globalThis.ENV = "test";
globalThis.NODE_ENV = "test";

// Mock Redis/IORedis for Bun compatibility
const createMockRedisClient = () => ({
	connect: async () => undefined,
	disconnect: async () => undefined,
	get: async (key: string) => {
		if (key === "existing-key") return "existing-value";
		if (key.startsWith("session:")) return JSON.stringify({ userId: "test-user" });
		return null;
	},
	set: async () => "OK",
	del: async () => 1,
	exists: async (key: string) => (key === "existing-key" ? 1 : 0),
	expire: async () => 1,
	ttl: async () => 3600,
	ping: async () => "PONG",
	flushdb: async () => "OK",
	keys: async () => ["key1", "key2", "key3"],
	mget: async () => ["value1", "value2", null],
	mset: async () => "OK",
	incr: async () => 1,
	decr: async () => 0,
	hget: async () => "hash-value",
	hset: async () => 1,
	hgetall: async () => ({ field1: "value1", field2: "value2" }),
	lpush: async () => 1,
	rpop: async () => "list-item",
	llen: async () => 5,
	sadd: async () => 1,
	smembers: async () => ["member1", "member2"],
	zadd: async () => 1,
	zrange: async () => ["item1", "item2"],
	pipeline: () => ({
		get: () => ({
			exec: async () => [
				[null, "value1"],
				[null, "OK"],
			],
		}),
		set: () => ({
			exec: async () => [
				[null, "value1"],
				[null, "OK"],
			],
		}),
		exec: async () => [
			[null, "value1"],
			[null, "OK"],
		],
	}),
	multi: () => ({
		get: function () {
			return this;
		},
		set: function () {
			return this;
		},
		exec: async () => [
			[null, "value1"],
			[null, "OK"],
		],
	}),
	on: () => {},
	off: () => {},
	status: "ready",
});

// Mock database connection
const createMockDb = () => {
	const mockDb: any = {
		select: () => mockDb,
		where: () => mockDb,
		orderBy: () => mockDb,
		limit: () => mockDb,
		insert: () => mockDb,
		values: async () => ({ rowCount: 1 }),
		update: () => mockDb,
		set: () => mockDb,
		delete: () => mockDb,
		execute: async () => [],
		query: async () => ({ rows: [], rowCount: 0 }),
		transaction: async (callback: any) => {
			return await callback(mockDb);
		},
		$transaction: async (callback: any) => {
			return await callback(mockDb);
		},
		prepare: () => ({
			execute: async () => ({ rows: [], rowCount: 0 }),
		}),
	};
	return mockDb;
};

// Mock Electric SQL client
const createMockElectricClient = () => ({
	connect: async () => undefined,
	close: async () => undefined,
	isConnected: true,
	potentiallyChanged: () => {},
	syncTable: async () => undefined,
	subscribe: () => ({
		unsubscribe: () => {},
	}),
	db: createMockDb(),
});

// Mock Inngest client
const createMockInngest = () => ({
	send: async () => ({ ids: ["test-id"] }),
	createFunction: () => ({
		name: "test-function",
		trigger: {},
	}),
	serve: () => {},
});

// Browser API mocks for SSR compatibility
if (typeof window === "undefined") {
	global.window = {
		localStorage: {
			getItem: () => null,
			setItem: () => {},
			removeItem: () => {},
			clear: () => {},
			length: 0,
			key: () => null,
		},
		sessionStorage: {
			getItem: () => null,
			setItem: () => {},
			removeItem: () => {},
			clear: () => {},
			length: 0,
			key: () => null,
		},
		location: {
			href: "http://localhost:3000",
			origin: "http://localhost:3000",
		},
		crypto: {
			randomUUID: () => "test-uuid-123",
			getRandomValues: (array: any) => array,
		},
		fetch: async () => ({
			ok: true,
			status: 200,
			json: async () => ({}),
			text: async () => "",
			blob: async () => new Blob(),
		}),
		WebSocket: class MockWebSocket {
			constructor() {}
			send() {}
			close() {}
			addEventListener() {}
			removeEventListener() {}
		},
	} as any;

	global.document = {
		createElement: () => ({
			setAttribute: () => {},
			getAttribute: () => null,
			appendChild: () => {},
			removeChild: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
		}),
		head: { appendChild: () => {} },
		body: { appendChild: () => {} },
	} as any;
}

// Export mock factories for use in tests
export const mockFactories = {
	redis: createMockRedisClient,
	db: createMockDb,
	electric: createMockElectricClient,
	inngest: createMockInngest,
};

// Global setup and teardown
beforeAll(async () => {
	// Global test setup
});

afterAll(async () => {
	// Global test cleanup
});

beforeEach(async () => {
	// Reset mocks before each test
	// Individual tests can override these as needed
});

afterEach(async () => {
	// Cleanup after each test
});

// Environment variable defaults for testing
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
process.env.ELECTRIC_URL = process.env.ELECTRIC_URL || "http://localhost:5133";
process.env.NODE_ENV = "test";
process.env.AUTH_SECRET = "test_auth_secret";
process.env.INNGEST_SIGNING_KEY = "test-signing-key";
process.env.INNGEST_EVENT_KEY = "test-event-key";
