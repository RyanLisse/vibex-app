/**
 * Mock Modules Configuration
 *
 * Centralized mocking for modules that cause issues in tests
 */
import { vi } from "vitest";

// Mock Inngest
vi.mock("inngest", () => ({
	Inngest: vi.fn().mockImplementation(() => ({
		send: vi.fn().mockResolvedValue({ id: "mock-event-id" }),
		createFunction: vi.fn(),
	})),
	serve: vi.fn(),
}));

// Mock database drivers
vi.mock("@neondatabase/serverless", () => ({
	neon: vi.fn(() => vi.fn()),
	Pool: vi.fn().mockImplementation(() => ({
		query: vi.fn().mockResolvedValue({ rows: [] }),
		connect: vi.fn().mockResolvedValue({
			query: vi.fn().mockResolvedValue({ rows: [] }),
			release: vi.fn(),
		}),
		end: vi.fn(),
	})),
}));

vi.mock("better-sqlite3", () => ({
	default: vi.fn().mockImplementation(() => ({
		prepare: vi.fn().mockReturnValue({
			run: vi.fn(),
			get: vi.fn(),
			all: vi.fn().mockReturnValue([]),
		}),
		exec: vi.fn(),
		close: vi.fn(),
	})),
}));

// Mock WebSocket
vi.mock("ws", () => ({
	WebSocketServer: vi.fn().mockImplementation(() => ({
		on: vi.fn(),
		close: vi.fn(),
		clients: new Set(),
	})),
	WebSocket: vi.fn().mockImplementation(() => ({
		send: vi.fn(),
		close: vi.fn(),
		on: vi.fn(),
		readyState: 1,
	})),
}));

// Mock Redis
vi.mock("ioredis", () => ({
	default: vi.fn().mockImplementation(() => ({
		get: vi.fn().mockResolvedValue(null),
		set: vi.fn().mockResolvedValue("OK"),
		del: vi.fn().mockResolvedValue(1),
		keys: vi.fn().mockResolvedValue([]),
		flushdb: vi.fn().mockResolvedValue("OK"),
		quit: vi.fn().mockResolvedValue("OK"),
		on: vi.fn(),
	})),
}));

// Mock Electric SQL
vi.mock("@electric-sql/client", () => ({
	ShapeStream: vi.fn().mockImplementation(() => ({
		subscribe: vi.fn().mockReturnValue({
			unsubscribe: vi.fn(),
		}),
	})),
}));

vi.mock("@electric-sql/pglite", () => ({
	PGlite: vi.fn().mockImplementation(() => ({
		query: vi.fn().mockResolvedValue({ rows: [] }),
		exec: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
	})),
}));

// Mock file system operations
vi.mock("fs", () => ({
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	existsSync: vi.fn().mockReturnValue(true),
	mkdirSync: vi.fn(),
	promises: {
		readFile: vi.fn().mockResolvedValue(""),
		writeFile: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
		access: vi.fn().mockResolvedValue(undefined),
	},
}));

// Mock child_process
vi.mock("child_process", () => ({
	spawn: vi.fn().mockReturnValue({
		stdout: { on: vi.fn() },
		stderr: { on: vi.fn() },
		on: vi.fn(),
		kill: vi.fn(),
	}),
	exec: vi.fn((cmd, callback) => callback?.(null, "", "")),
	execSync: vi.fn().mockReturnValue(Buffer.from("")),
}));

// Export mock utilities
export const mockUtils = {
	// Reset all mocks
	resetAll: () => {
		vi.clearAllMocks();
	},

	// Mock fetch responses
	mockFetch: (responses: Array<{ url: string | RegExp; response: any }>) => {
		global.fetch = vi.fn((url: string | URL | Request) => {
			const urlString = typeof url === "string" ? url : url instanceof URL ? url.toString() : "";

			for (const { url: pattern, response } of responses) {
				if (typeof pattern === "string" && urlString.includes(pattern)) {
					return Promise.resolve(response);
				}
				if (pattern instanceof RegExp && pattern.test(urlString)) {
					return Promise.resolve(response);
				}
			}

			// Default response
			return Promise.resolve({
				ok: true,
				status: 200,
				json: async () => ({}),
				text: async () => "",
			} as Response);
		});
	},
};
