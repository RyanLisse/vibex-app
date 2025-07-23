/**
 * Common mocks and utilities for test files
 * Eliminates duplicate mock patterns across test suite
 */
import { vi } from "vitest";

/**
 * Mock factory for Next.js server components
 */
export const createNextServerMocks = () => {
	const mockHandler = {
		GET: vi.fn(() => Promise.resolve(new Response("OK"))),
		POST: vi.fn(() => Promise.resolve(new Response("OK"))),
		PUT: vi.fn(() => Promise.resolve(new Response("OK"))),
		DELETE: vi.fn(() => Promise.resolve(new Response("OK"))),
	};

	const nextMocks = {
		NextRequest: class {
			constructor(
				public url: string,
				public init?: any,
			) {}
		},
		NextResponse: {
			json: vi.fn((data, init) => ({
				json: () => Promise.resolve(data),
				...init,
			})),
			text: vi.fn(),
		},
	};

	return { mockHandler, nextMocks };
};

/**
 * Mock factory for Inngest
 */
export const createInngestMocks = () => {
	const mockHandler = {
		GET: vi.fn(() => Promise.resolve(new Response("Inngest endpoint ready"))),
		POST: vi.fn(() => Promise.resolve(new Response("Inngest webhook handled"))),
		PUT: vi.fn(() => Promise.resolve(new Response("Inngest function updated"))),
	};

	const inngestMocks = {
		serve: vi.fn(() => mockHandler),
		inngest: {
			createFunction: vi.fn(() => ({
				id: "test-function",
				name: "Test Function",
			})),
			send: vi.fn(() => Promise.resolve({ id: "test-event-id" })),
		},
		createTask: vi.fn(() => Promise.resolve({ success: true })),
		taskControl: vi.fn(() => Promise.resolve({ success: true })),
		taskChannel: vi.fn(() => ({
			status: vi.fn(),
			update: vi.fn(),
			control: vi.fn(),
		})),
	};

	return { mockHandler, inngestMocks };
};

/**
 * Mock factory for Prometheus client
 */
export const createPrometheusClientMocks = () => {
	const createMockMetric = (methodNames: string[]) => {
		const mockMetric: any = {};

		// Create mock methods
		for (const methodName of methodNames) {
			mockMetric[methodName] = vi.fn();
		}

		// labels method returns object with all methods
		mockMetric.labels = vi.fn(() => {
			const labeled: any = {};
			for (const methodName of methodNames) {
				labeled[methodName] = vi.fn();
			}
			return labeled;
		});

		return mockMetric;
	};

	return {
		Summary: vi.fn(() => createMockMetric(["observe"])),
		Histogram: vi.fn(() => createMockMetric(["observe"])),
		Counter: vi.fn(() => createMockMetric(["inc"])),
		Gauge: vi.fn(() => createMockMetric(["set", "inc", "dec"])),
		register: {
			clear: vi.fn(() => {}),
			metrics: vi.fn(() =>
				Promise.resolve(
					'# Mock metrics\nagent_operations_total{agent_id="agent-1",agent_type="code-gen",operation="execute",provider="openai",status="success"} 1',
				),
			),
		},
	};
};

/**
 * Common environment setup for tests
 */
export const setupTestEnvironment = (config: {
	nodeEnv?: string;
	inngestKeys?: boolean;
	telemetryKeys?: boolean;
}) => {
	const originalEnv = process.env;

	// Set NODE_ENV using Object.defineProperty to avoid read-only error
	if (config.nodeEnv) {
		Object.defineProperty(process.env, 'NODE_ENV', {
			value: config.nodeEnv,
			configurable: true
		});
	}

	if (config.inngestKeys) {
		process.env.INNGEST_SIGNING_KEY = "test-signing-key";
		process.env.INNGEST_EVENT_KEY = "test-event-key";
	}

	if (config.telemetryKeys) {
		process.env.OTEL_ENABLED = "true";
		process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317";
		process.env.OTEL_SERVICE_NAME = "test-service";
		process.env.OTEL_SERVICE_VERSION = "1.0.0";
	}

	return () => {
		process.env = originalEnv;
	};
};

/**
 * Common console spy setup
 */
export const setupConsoleSpy = () => {
	const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

	const cleanup = () => {
		consoleSpy?.mockRestore();
		consoleErrorSpy?.mockRestore();
		consoleWarnSpy?.mockRestore();
	};

	return { consoleSpy, consoleErrorSpy, consoleWarnSpy, cleanup };
};

/**
 * Mock request factory
 */
export const createMockRequest = (url: string, options?: {
	method?: string;
	body?: any;
	headers?: Record<string, string>;
}) => {
	const { method = "GET", body, headers = {} } = options || {};
	
	return new (createNextServerMocks().nextMocks.NextRequest as any)(url, {
		method,
		body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
		headers,
	});
};

/**
 * Generic test setup utility
 */
export const createTestSetup = <T>(
	setupFn: () => T,
	cleanupFn?: (instance: T) => void
) => {
	let instance: T;

	const beforeEach = () => {
		instance = setupFn();
		return instance;
	};

	const afterEach = () => {
		if (cleanupFn && instance) {
			cleanupFn(instance);
		}
	};

	return { beforeEach, afterEach, getInstance: () => instance };
};