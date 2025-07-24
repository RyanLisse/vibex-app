/**
 * Isolated Test - Project Environment
 *
 * This test uses the same pattern that worked outside the project
 * to see if the issue is with file naming or project environment.
 */

import { test, expect } from "vitest";

test("basic arithmetic", () => {
	expect(1 + 1).toBe(2);
});

test("string operations", () => {
	expect("hello".toUpperCase()).toBe("HELLO");
});

test("async operation", async () => {
	const result = await Promise.resolve("success");
	expect(result).toBe("success");
});
