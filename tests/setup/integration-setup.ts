/**
 * Integration Test Setup
 *
 * Setup file for integration tests including:
 * - Database mocking
 * - API route testing utilities
 * - Inngest function testing
 * - External service mocking
 */

import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

// Import browser mocks from vitest-setup.js
import "../../vitest-setup.js";

// Environment setup
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.INNGEST_SIGNING_KEY = "test-signing-key";
process.env.INNGEST_EVENT_KEY = "test-event-key";
process.env.AUTH_SECRET = "test-auth-secret";

// Mock external services
vi.mock("@google/generative-ai", () => ({
	GoogleGenerativeAI: vi.fn(() => ({
		getGenerativeModel: vi.fn(() => ({
			generateContent: vi.fn().mockResolvedValue({
				response: {
					text: () => "Mocked AI response",
				},
			}),
		})),
	})),
}));

// Mock Inngest client for testing
vi.mock("@/lib/inngest", () => ({
	inngest: {
		createFunction: vi.fn((config, handler) => ({
			...config,
			handler,
			_isMocked: true,
		})),
		send: vi.fn().mockResolvedValue({ ids: ["mock-event-id"] }),
	},
}));

// Mock database client
vi.mock("@/db", () => ({
	db: {
		query: vi.fn(),
		execute: vi.fn(),
		transaction: vi.fn((callback) =>
			callback({
				query: vi.fn(),
				execute: vi.fn(),
				rollback: vi.fn(),
				commit: vi.fn(),
			})
		),
	},
}));

// Mock Redis client
vi.mock("@/lib/redis/client", () => ({
	redis: {
		get: vi.fn(),
		set: vi.fn(),
		del: vi.fn(),
		expire: vi.fn(),
		ttl: vi.fn(),
		exists: vi.fn(),
		scan: vi.fn().mockResolvedValue(["0", []]),
		pipeline: vi.fn(() => ({
			exec: vi.fn().mockResolvedValue([]),
		})),
	},
}));

// Mock fetch for API testing
global.fetch = vi.fn();

// Mock NextRequest/NextResponse for API route testing
global.Request = class Request {
	constructor(
		public url: string,
		public init?: RequestInit
	) {
		this.method = init?.method || "GET";
		this.headers = new Headers(init?.headers);
		this.body = init?.body;
	}

	method: string;
	headers: Headers;
	body: any;

	async json() {
		return JSON.parse(this.body);
	}

	async text() {
		return this.body;
	}
};

global.Response = class Response {
	constructor(
		public body: any,
		public init?: ResponseInit
	) {
		this.status = init?.status || 200;
		this.statusText = init?.statusText || "OK";
		this.headers = new Headers(init?.headers);
	}

	status: number;
	statusText: string;
	headers: Headers;
	ok = this.status >= 200 && this.status < 300;

	async json() {
		return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
	}

	async text() {
		return typeof this.body === "string" ? this.body : JSON.stringify(this.body);
	}

	static json(data: any, init?: ResponseInit) {
		return new Response(JSON.stringify(data), {
			...init,
			headers: {
				"Content-Type": "application/json",
				...init?.headers,
			},
		});
	}

	static error() {
		return new Response(null, { status: 500 });
	}
};

// Setup hooks
beforeAll(() => {
	console.log("🧪 Integration tests starting...");
});

afterAll(() => {
	vi.restoreAllMocks();
	console.log("✅ Integration tests completed");
});

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	// Clean up any test data
});

// Export test utilities
export const mockDatabase = {
	query: vi.mocked(vi.fn()),
	execute: vi.mocked(vi.fn()),
	transaction: vi.mocked(vi.fn()),
};

export const mockRedis = {
	get: vi.mocked(vi.fn()),
	set: vi.mocked(vi.fn()),
	del: vi.mocked(vi.fn()),
};

export const mockInngest = {
	send: vi.mocked(vi.fn()),
	createFunction: vi.mocked(vi.fn()),
};

// Helper to create mock API context
export function createMockAPIContext(
	options: {
		method?: string;
		headers?: Record<string, string>;
		body?: any;
		query?: Record<string, string>;
	} = {}
) {
	const url = new URL("http://localhost:3000/api/test");

	if (options.query) {
		Object.entries(options.query).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	return new Request(url.toString(), {
		method: options.method || "GET",
		headers: options.headers,
		body: options.body ? JSON.stringify(options.body) : undefined,
	});
}
