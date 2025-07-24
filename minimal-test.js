/**
 * Minimal Test - No Setup, No Mocks
 *
 * This test file is designed to verify that basic Vitest functionality works
 * without any complex setup or mocking. If this hangs, the issue is with
 * the core Vitest configuration.
 */

import { describe, it, expect } from "vitest";

describe("Minimal Test Suite", () => {
	it("should perform basic arithmetic", () => {
		expect(2 + 2).toBe(4);
		expect(5 * 3).toBe(15);
		expect(10 / 2).toBe(5);
	});

	it("should handle string operations", () => {
		expect("hello".toUpperCase()).toBe("HELLO");
		expect("world".length).toBe(5);
		expect("test".includes("es")).toBe(true);
	});

	it("should work with arrays", () => {
		const arr = [1, 2, 3];
		expect(arr.length).toBe(3);
		expect(arr.includes(2)).toBe(true);
		expect(arr.map((x) => x * 2)).toEqual([2, 4, 6]);
	});

	it("should handle promises", async () => {
		const promise = Promise.resolve("success");
		const result = await promise;
		expect(result).toBe("success");
	});

	it("should handle timeouts", async () => {
		const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
		const start = Date.now();
		await delay(10);
		const end = Date.now();
		expect(end - start).toBeGreaterThanOrEqual(10);
	});
});
