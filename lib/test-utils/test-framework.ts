/**
 * Test Framework Abstraction Layer
 *
 * Provides framework-agnostic test utilities that work with both Bun's native
 * test runner and Vitest. This resolves import conflicts and ensures consistent
 * test syntax across the codebase.
 *
 * Usage:
 * ```typescript
 * import { describe, it, expect, beforeEach, afterEach } from '@/lib/test-utils/test-framework';
 *
 * describe('My Component', () => {
 *   it('should work', () => {
 *     expect(true).toBe(true);
 *   });
 * });
 * ```
 */

// Framework detection utilities
function isVitest(): boolean {
	return typeof globalThis.vi !== "undefined" || process.env.VITEST === "true";
}

function isBun(): boolean {
	return typeof process !== "undefined" && "Bun" in globalThis;
}

// Type definitions for cross-framework compatibility
export interface TestFunction {
	(name: string, fn: () => void | Promise<void>): void;
	skip: (name: string, fn: () => void | Promise<void>) => void;
	only: (name: string, fn: () => void | Promise<void>) => void;
	todo: (name: string, fn?: () => void | Promise<void>) => void;
}

export interface DescribeFunction {
	(name: string, fn: () => void): void;
	skip: (name: string, fn: () => void) => void;
	only: (name: string, fn: () => void) => void;
	todo: (name: string, fn?: () => void) => void;
}

export interface BeforeEachFunction {
	(fn: () => void | Promise<void>): void;
}

export interface AfterEachFunction {
	(fn: () => void | Promise<void>): void;
}

export interface BeforeAllFunction {
	(fn: () => void | Promise<void>): void;
}

export interface AfterAllFunction {
	(fn: () => void | Promise<void>): void;
}

// Unified expect interface
export interface ExpectStatic {
	(actual: any): any;
	extend(matchers: Record<string, any>): void;
	assertions(count: number): void;
	hasAssertions(): void;
	any(constructor: any): any;
	anything(): any;
	arrayContaining(sample: any[]): any;
	objectContaining(sample: Record<string, any>): any;
	stringContaining(sample: string): any;
	stringMatching(sample: string | RegExp): any;
}

// Create framework-agnostic implementations
let testFramework: {
	describe: DescribeFunction;
	it: TestFunction;
	test: TestFunction;
	expect: ExpectStatic;
	beforeEach: BeforeEachFunction;
	afterEach: AfterEachFunction;
	beforeAll: BeforeAllFunction;
	afterAll: AfterAllFunction;
};

if (isVitest()) {
	// Use Vitest implementations
	try {
		const vitest = globalThis.vi ? globalThis : require("vitest");

		testFramework = {
			describe: vitest.describe,
			it: vitest.it,
			test: vitest.test || vitest.it,
			expect: vitest.expect,
			beforeEach: vitest.beforeEach,
			afterEach: vitest.afterEach,
			beforeAll: vitest.beforeAll,
			afterAll: vitest.afterAll,
		};
	} catch (error) {
		throw new Error("Vitest not available but detected as current framework");
	}
} else if (isBun()) {
	// Use Bun test implementations
	try {
		const bunTest = require("bun:test");

		testFramework = {
			describe: bunTest.describe,
			it: bunTest.it,
			test: bunTest.test || bunTest.it,
			expect: bunTest.expect,
			beforeEach: bunTest.beforeEach,
			afterEach: bunTest.afterEach,
			beforeAll: bunTest.beforeAll,
			afterAll: bunTest.afterAll,
		};
	} catch (error) {
		throw new Error("Bun test not available but detected as current framework");
	}
} else {
	// Fallback implementation for other environments
	const fallbackImplementation = (name: string) => () => {
		console.warn(`${name} called but no test framework detected`);
	};

	testFramework = {
		describe: fallbackImplementation("describe") as any,
		it: fallbackImplementation("it") as any,
		test: fallbackImplementation("test") as any,
		expect: (() => {
			const expectFn = (actual: any) => ({
				toBe: (expected: any) => console.warn("expect.toBe called in fallback mode"),
				toEqual: (expected: any) => console.warn("expect.toEqual called in fallback mode"),
				toBeTruthy: () => console.warn("expect.toBeTruthy called in fallback mode"),
				toBeFalsy: () => console.warn("expect.toBeFalsy called in fallback mode"),
			});
			expectFn.extend = () => console.warn("expect.extend called in fallback mode");
			expectFn.assertions = () => console.warn("expect.assertions called in fallback mode");
			expectFn.hasAssertions = () => console.warn("expect.hasAssertions called in fallback mode");
			expectFn.any = () => console.warn("expect.any called in fallback mode");
			expectFn.anything = () => console.warn("expect.anything called in fallback mode");
			expectFn.arrayContaining = () =>
				console.warn("expect.arrayContaining called in fallback mode");
			expectFn.objectContaining = () =>
				console.warn("expect.objectContaining called in fallback mode");
			expectFn.stringContaining = () =>
				console.warn("expect.stringContaining called in fallback mode");
			expectFn.stringMatching = () => console.warn("expect.stringMatching called in fallback mode");
			return expectFn;
		})() as any,
		beforeEach: fallbackImplementation("beforeEach") as any,
		afterEach: fallbackImplementation("afterEach") as any,
		beforeAll: fallbackImplementation("beforeAll") as any,
		afterAll: fallbackImplementation("afterAll") as any,
	};
}

// Export framework-agnostic test utilities
export const describe = testFramework.describe;
export const it = testFramework.it;
export const test = testFramework.test;
export const expect = testFramework.expect;
export const beforeEach = testFramework.beforeEach;
export const afterEach = testFramework.afterEach;
export const beforeAll = testFramework.beforeAll;
export const afterAll = testFramework.afterAll;

// Export framework detection utilities for advanced usage
export { isVitest, isBun };

// Export the current framework name for debugging
export const currentFramework = isVitest() ? "vitest" : isBun() ? "bun" : "fallback";

// Default export for convenience
const testFramework = {
	describe,
	it,
	test,
	expect,
	beforeEach,
	afterEach,
	beforeAll,
	afterAll,
	isVitest,
	isBun,
	currentFramework,
};

export default testFramework;
