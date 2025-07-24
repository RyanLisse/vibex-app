/**
 * Consolidated Test Setup Utilities
 *
 * Eliminates duplication across test setup files by providing
 * reusable setup functions for different test environments.
 */

import type { MockedFunction } from "vitest";
import { vi } from "vitest";

export interface TestEnvironmentConfig {
	nodeEnv?: string;
	mockFetch?: boolean;
	mockConsole?: boolean;
	mockPerformance?: boolean;
	mockStorage?: boolean;
	mockNextRouter?: boolean;
	mockResizeObserver?: boolean;
	mockMatchMedia?: boolean;
	inngestKeys?: boolean;
	telemetryKeys?: boolean;
	databaseUrl?: string;
}

export interface MockedGlobals {
	fetch?: MockedFunction<any>;
	console?: {
		log: MockedFunction<any>;
		debug: MockedFunction<any>;
		info: MockedFunction<any>;
		warn: MockedFunction<any>;
		error: MockedFunction<any>;
	};
	performance?: {
		now: MockedFunction<any>;
		mark: MockedFunction<any>;
		measure: MockedFunction<any>;
		clearMarks: MockedFunction<any>;
		clearMeasures: MockedFunction<any>;
		getEntriesByName: MockedFunction<any>;
		getEntriesByType: MockedFunction<any>;
		getEntries: MockedFunction<any>;
		timeOrigin: number;
	};
	localStorage?: {
		getItem: MockedFunction<any>;
		setItem: MockedFunction<any>;
		removeItem: MockedFunction<any>;
		clear: MockedFunction<any>;
	};
	sessionStorage?: {
		getItem: MockedFunction<any>;
		setItem: MockedFunction<any>;
		removeItem: MockedFunction<any>;
		clear: MockedFunction<any>;
	};
}

/**
 * Sets up common test environment with configurable mocks
 */
export function setupTestEnvironment(config: TestEnvironmentConfig = {}): MockedGlobals {
	const mocks: MockedGlobals = {};

	// Environment variables
	if (config.nodeEnv) {
		Object.defineProperty(process.env, "NODE_ENV", {
			value: config.nodeEnv,
			configurable: true,
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

	if (config.databaseUrl) {
		process.env.DATABASE_URL = config.databaseUrl;
	}

	// Mock fetch
	if (config.mockFetch !== false) {
		const mockFetch = vi.fn();
		global.fetch = mockFetch;
		mocks.fetch = mockFetch;
	}

	// Mock console
	if (config.mockConsole !== false) {
		const consoleMocks = {
			log: vi.fn(),
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};

		global.console = {
			...console,
			...consoleMocks,
		};
		mocks.console = consoleMocks;
	}

	// Mock performance API
	if (config.mockPerformance !== false) {
		const performanceMocks = {
			now: vi.fn(() => Date.now()),
			mark: vi.fn(),
			measure: vi.fn(),
			clearMarks: vi.fn(),
			clearMeasures: vi.fn(),
			getEntriesByName: vi.fn(() => []),
			getEntriesByType: vi.fn(() => []),
			getEntries: vi.fn(() => []),
			timeOrigin: Date.now(),
		};

		Object.defineProperty(global, "performance", {
			value: performanceMocks,
			writable: true,
			configurable: true,
		});
		mocks.performance = performanceMocks;
	}

	// Mock storage APIs
	if (config.mockStorage !== false) {
		const localStorageMocks = {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
		};

		const sessionStorageMocks = {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
		};

		Object.defineProperty(global, "localStorage", {
			value: localStorageMocks,
			writable: true,
			configurable: true,
		});

		Object.defineProperty(global, "sessionStorage", {
			value: sessionStorageMocks,
			writable: true,
			configurable: true,
		});

		mocks.localStorage = localStorageMocks;
		mocks.sessionStorage = sessionStorageMocks;
	}

	return mocks;
}

/**
 * Sets up Next.js specific mocks
 */
export function setupNextJsMocks() {
	// Mock Next.js router
	vi.mock("next/navigation", () => ({
		useRouter: () => ({
			push: vi.fn(),
			replace: vi.fn(),
			prefetch: vi.fn(),
			back: vi.fn(),
			forward: vi.fn(),
			refresh: vi.fn(),
		}),
		usePathname: () => "/",
		useSearchParams: () => new URLSearchParams(),
		useParams: () => ({}),
	}));

	// Mock Next.js dynamic imports
	vi.mock("next/dynamic", () => {
		return vi.fn((fn: any) => {
			return fn();
		});
	});
}

/**
 * Sets up browser-specific mocks for jsdom environment
 */
export function setupBrowserMocks() {
	// Mock ResizeObserver
	global.ResizeObserver = vi.fn().mockImplementation(() => ({
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn(),
	}));

	// Mock matchMedia
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});

	// Mock IntersectionObserver
	global.IntersectionObserver = vi.fn().mockImplementation(() => ({
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn(),
	}));
}

/**
 * Creates a test setup factory with cleanup
 */
export function createTestSetup<T>(
	setupFn: () => T | Promise<T>,
	cleanupFn?: (instance: T) => void | Promise<void>
) {
	let instance: T;

	const beforeEach = async () => {
		instance = await setupFn();
		return instance;
	};

	const afterEach = async () => {
		if (cleanupFn && instance) {
			await cleanupFn(instance);
		}
	};

	return {
		beforeEach,
		afterEach,
		getInstance: () => instance,
	};
}

/**
 * Common test environment presets
 */
export const testPresets = {
	unit: (): MockedGlobals =>
		setupTestEnvironment({
			nodeEnv: "test",
			mockFetch: true,
			mockConsole: true,
			mockPerformance: true,
			mockStorage: true,
		}),

	component: (): MockedGlobals => {
		setupNextJsMocks();
		setupBrowserMocks();
		return setupTestEnvironment({
			nodeEnv: "test",
			mockFetch: true,
			mockConsole: true,
			mockPerformance: true,
			mockStorage: true,
		});
	},

	integration: (): MockedGlobals =>
		setupTestEnvironment({
			nodeEnv: "test",
			mockFetch: true,
			mockConsole: false, // Keep console for debugging integration tests
			mockPerformance: true,
			mockStorage: true,
			inngestKeys: true,
			telemetryKeys: true,
			databaseUrl: "postgresql://test:test@localhost:5432/test_db",
		}),

	api: (): MockedGlobals =>
		setupTestEnvironment({
			nodeEnv: "test",
			mockFetch: true,
			mockConsole: true,
			mockPerformance: true,
			inngestKeys: true,
			telemetryKeys: true,
		}),
};

/**
 * Cleanup function to reset all mocks
 */
export function cleanupTestEnvironment() {
	vi.clearAllMocks();
	vi.resetAllMocks();
	vi.restoreAllMocks();
}
