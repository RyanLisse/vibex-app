/**
 * Bun Test Compatibility Shim
 *
 * Provides bun:test API compatibility with Vitest
 * Fixes "externalize bun:test" module errors
 */

import {
	vi,
	afterAll as vitestAfterAll,
	afterEach as vitestAfterEach,
	beforeAll as vitestBeforeAll,
	beforeEach as vitestBeforeEach,
	describe as vitestDescribe,
	expect as vitestExpected,
	it as vitestIt,
	test as vitestTest,
} from "vitest";

// Export Vitest functions with bun:test names
export const describe = vitestDescribe;
export const it = vitestIt;
export const test = vitestTest;
export const expect = vitestExpected;
export const beforeAll = vitestBeforeAll;
export const beforeEach = vitestBeforeEach;
export const afterAll = vitestAfterAll;
export const afterEach = vitestAfterEach;

// Bun's mock function equivalent using Vitest
export const mock = vi.fn;

// Bun-specific test utilities using Vitest equivalents
export const spyOn = vi.spyOn;
export const clearAllMocks = vi.clearAllMocks;
export const resetAllMocks = vi.resetAllMocks;
export const restoreAllMocks = vi.restoreAllMocks;

// Additional Bun test API compatibility
export const jest = {
	fn: vi.fn,
	spyOn: vi.spyOn,
	clearAllMocks: vi.clearAllMocks,
	resetAllMocks: vi.resetAllMocks,
	restoreAllMocks: vi.restoreAllMocks,
	mock: vi.mock,
	unmock: vi.unmock,
	doMock: vi.doMock,
	dontMock: vi.dontMock,
};

// Default export for compatibility
const bunTestShim = {
	describe,
	it,
	test,
	expect,
	beforeAll,
	beforeEach,
	afterAll,
	afterEach,
	mock,
	spyOn,
	clearAllMocks,
	resetAllMocks,
	restoreAllMocks,
	jest,
};

export default bunTestShim;
