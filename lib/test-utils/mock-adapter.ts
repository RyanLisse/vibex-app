/**
 * Test Mock Adapter
 *
 * Provides a unified interface for mocking functionality that works with both
 * Bun's native test runner and Vitest. This abstraction layer resolves the
 * "vi.mock is not a function" errors when Bun tests encounter Vitest mocking.
 */

// Type definitions for cross-framework compatibility
export const MockFunction = {
	mockReturnValue: (value) => {},
	mockReturnValueOnce: (value) => {},
	mockResolvedValue: (value) => {},
	mockResolvedValueOnce: (value) => {},
	mockRejectedValue: (value) => {},
	mockRejectedValueOnce: (value) => {},
	mockImplementation: (fn) => {},
	mockImplementationOnce: (fn) => {},
	mockClear: () => {},
	mockReset: () => {},
	mockRestore: () => {},
	getMockImplementation: () => undefined,
	getMockName: () => "mockFn",
	mock: {
		calls: [],
		results: [],
		instances: [],
		contexts: [],
		lastCall: undefined,
	},
};

export const TestMockAdapter = {
	fn: (implementation) => {},
	spyOn: (object, method) => {},
	mock: (moduleName, factory) => {},
	doMock: (moduleName, factory) => {},
	dontMock: (moduleName) => {},
	unmock: (moduleName) => {},
	clearAllMocks: () => {},
	resetAllMocks: () => {},
	restoreAllMocks: () => {},
};

// Framework detection utilities
function isVitest(): boolean {
	return typeof globalThis.vi !== "undefined" || process.env.VITEST === "true";
}

function isBun(): boolean {
	return typeof process !== "undefined" && "Bun" in globalThis;
}

// Vitest implementation
class VitestMockAdapter implements TestMockAdapter {
	private vi: any;

	constructor() {
		// Dynamic import to avoid issues in Bun environment
		try {
			this.vi = globalThis.vi || require("vitest").vi;
		} catch (error) {
			throw new Error("Vitest not available in this environment");
		}
	}

	fn<T extends (...args: any[]) => any>(implementation?: T): MockFunction<T> {
		return this.vi.fn(implementation) as MockFunction<T>;
	}

	spyOn<T, K extends keyof T>(
		object: T,
		method: K
	): MockFunction<T[K] extends (...args: any[]) => any ? T[K] : never> {
		return this.vi.spyOn(object, method) as any;
	}

	mock(moduleName: string, factory?: () => any): void {
		this.vi.mock(moduleName, factory);
	}

	doMock(moduleName: string, factory?: () => any): void {
		this.vi.doMock(moduleName, factory);
	}

	dontMock(moduleName: string): void {
		this.vi.dontMock(moduleName);
	}

	unmock(moduleName: string): void {
		this.vi.unmock(moduleName);
	}

	clearAllMocks(): void {
		this.vi.clearAllMocks();
	}

	resetAllMocks(): void {
		this.vi.resetAllMocks();
	}

	restoreAllMocks(): void {
		this.vi.restoreAllMocks();
	}
}

// Bun implementation (fallback for compatibility)
class BunMockAdapter implements TestMockAdapter {
	private bunTest: any;

	constructor() {
		try {
			// Check if we're actually in a Bun environment before requiring bun:test
			if (typeof process !== "undefined" && "Bun" in globalThis) {
				this.bunTest = require("bun:test");
			} else {
				// Fallback to Vitest if bun:test is not available
				throw new Error("Not in Bun environment, fallback required");
			}
		} catch (error) {
			throw new Error("Bun test module not available in this environment");
		}
	}

	fn<T extends (...args: any[]) => any>(implementation?: T): MockFunction<T> {
		const mockFn = this.bunTest.mock(implementation) as any;

		// Add Vitest-compatible methods to Bun mocks
		if (!mockFn.mockReturnValue) {
			mockFn.mockReturnValue = (value: any) => {
				mockFn.mockImplementation(() => value);
				return mockFn;
			};
		}

		if (!mockFn.mockReturnValueOnce) {
			mockFn.mockReturnValueOnce = (value: any) => {
				mockFn.mockImplementationOnce(() => value);
				return mockFn;
			};
		}

		if (!mockFn.mockResolvedValue) {
			mockFn.mockResolvedValue = (value: any) => {
				mockFn.mockImplementation(() => Promise.resolve(value));
				return mockFn;
			};
		}

		if (!mockFn.mockResolvedValueOnce) {
			mockFn.mockResolvedValueOnce = (value: any) => {
				mockFn.mockImplementationOnce(() => Promise.resolve(value));
				return mockFn;
			};
		}

		if (!mockFn.mockRejectedValue) {
			mockFn.mockRejectedValue = (value: any) => {
				mockFn.mockImplementation(() => Promise.reject(value));
				return mockFn;
			};
		}

		if (!mockFn.mockRejectedValueOnce) {
			mockFn.mockRejectedValueOnce = (value: any) => {
				mockFn.mockImplementationOnce(() => Promise.reject(value));
				return mockFn;
			};
		}

		return mockFn as MockFunction<T>;
	}

	spyOn<T, K extends keyof T>(
		object: T,
		method: K
	): MockFunction<T[K] extends (...args: any[]) => any ? T[K] : never> {
		const originalMethod = object[method];
		const spy = this.bunTest.mock(originalMethod);
		object[method] = spy as any;

		// Add restore functionality
		spy.mockRestore = () => {
			object[method] = originalMethod;
			return spy;
		};

		return spy as any;
	}

	mock(moduleName: string, factory?: () => any): void {
		// Bun's module mocking is handled differently
		// This is a compatibility layer for Vitest-style module mocking
		if (this.bunTest.mock && this.bunTest.mock.module) {
			this.bunTest.mock.module(moduleName, factory);
		} else {
			console.warn(
				`Module mocking for "${moduleName}" not fully supported in Bun compatibility mode`
			);
		}
	}

	doMock(moduleName: string, factory?: () => any): void {
		this.mock(moduleName, factory);
	}

	dontMock(moduleName: string): void {
		console.warn(`dontMock for "${moduleName}" not implemented in Bun compatibility mode`);
	}

	unmock(moduleName: string): void {
		console.warn(`unmock for "${moduleName}" not implemented in Bun compatibility mode`);
	}

	clearAllMocks(): void {
		// Bun doesn't have a global clearAllMocks, so this is a no-op
		console.warn("clearAllMocks not implemented in Bun compatibility mode");
	}

	resetAllMocks(): void {
		// Bun doesn't have a global resetAllMocks, so this is a no-op
		console.warn("resetAllMocks not implemented in Bun compatibility mode");
	}

	restoreAllMocks(): void {
		// Bun doesn't have a global restoreAllMocks, so this is a no-op
		console.warn("restoreAllMocks not implemented in Bun compatibility mode");
	}
}

// Fallback implementation for environments without either framework
class FallbackMockAdapter implements TestMockAdapter {
	fn<T extends (...args: any[]) => any>(implementation?: T): MockFunction<T> {
		const mockFn = (implementation || (() => {})) as any;

		// Create a basic mock function with minimal compatibility
		const mock = (...args: any[]) => {
			mock.mock.calls.push(args);
			const result = mockFn(...args);
			mock.mock.results.push({ type: "return", value: result });
			return result;
		};

		// Add mock properties and methods
		mock.mock = {
			calls: [],
			results: [],
			instances: [],
			contexts: [],
		};

		mock.mockReturnValue = (value: any) => {
			mockFn.mockImplementation = () => value;
			return mock;
		};

		mock.mockReturnValueOnce = mock.mockReturnValue;
		mock.mockResolvedValue = (value: any) => {
			mockFn.mockImplementation = () => Promise.resolve(value);
			return mock;
		};

		mock.mockResolvedValueOnce = mock.mockResolvedValue;
		mock.mockRejectedValue = (value: any) => {
			mockFn.mockImplementation = () => Promise.reject(value);
			return mock;
		};

		mock.mockRejectedValueOnce = mock.mockRejectedValue;
		mock.mockImplementation = (fn: T) => {
			Object.assign(mockFn, fn);
			return mock;
		};

		mock.mockImplementationOnce = mock.mockImplementation;
		mock.mockClear = () => {
			mock.mock.calls = [];
			mock.mock.results = [];
			return mock;
		};

		mock.mockReset = mock.mockClear;
		mock.mockRestore = () => mock;
		mock.getMockImplementation = () => mockFn;
		mock.getMockName = () => "mockFn";

		return mock as MockFunction<T>;
	}

	spyOn<T, K extends keyof T>(
		object: T,
		method: K
	): MockFunction<T[K] extends (...args: any[]) => any ? T[K] : never> {
		const originalMethod = object[method];
		const spy = this.fn(originalMethod as any);
		object[method] = spy as any;

		spy.mockRestore = () => {
			object[method] = originalMethod;
			return spy;
		};

		return spy as any;
	}

	mock(moduleName: string, factory?: () => any): void {
		console.warn(`Module mocking for "${moduleName}" not supported in fallback mode`);
	}

	doMock(moduleName: string, factory?: () => any): void {
		this.mock(moduleName, factory);
	}

	dontMock(moduleName: string): void {
		console.warn(`dontMock for "${moduleName}" not supported in fallback mode`);
	}

	unmock(moduleName: string): void {
		console.warn(`unmock for "${moduleName}" not supported in fallback mode`);
	}

	clearAllMocks(): void {
		console.warn("clearAllMocks not supported in fallback mode");
	}

	resetAllMocks(): void {
		console.warn("resetAllMocks not supported in fallback mode");
	}

	restoreAllMocks(): void {
		console.warn("restoreAllMocks not supported in fallback mode");
	}
}

// Create and export the appropriate adapter based on the current environment
function createMockAdapter(): TestMockAdapter {
	// Prioritize Vitest in all testing environments
	if (isVitest()) {
		try {
			return new VitestMockAdapter();
		} catch (error) {
			console.warn("Failed to create Vitest mock adapter, falling back to fallback adapter");
			return new FallbackMockAdapter();
		}
	}

	// Only use Bun adapter if we're actually in Bun environment AND not running Vitest
	if (isBun() && !process.env.VITEST) {
		try {
			return new BunMockAdapter();
		} catch (error) {
			console.warn("Failed to create Bun mock adapter, falling back to fallback adapter");
			return new FallbackMockAdapter();
		}
	}

	return new FallbackMockAdapter();
}

// Export the mock adapter instance
export const mockAdapter = createMockAdapter();

// Export convenience functions that match Vitest API
export const fn = mockAdapter.fn.bind(mockAdapter);
export const spyOn = mockAdapter.spyOn.bind(mockAdapter);
export const mock = mockAdapter.mock.bind(mockAdapter);
export const doMock = mockAdapter.doMock.bind(mockAdapter);
export const dontMock = mockAdapter.dontMock.bind(mockAdapter);
export const unmock = mockAdapter.unmock.bind(mockAdapter);
export const clearAllMocks = mockAdapter.clearAllMocks.bind(mockAdapter);
export const resetAllMocks = mockAdapter.resetAllMocks.bind(mockAdapter);
export const restoreAllMocks = mockAdapter.restoreAllMocks.bind(mockAdapter);

// Default export for convenience
export default mockAdapter;
