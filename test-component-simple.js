/**
 * Simple Component Test Check
 * This script tests if our component testing environment is working
 */

import { describe, it, expect } from "vitest";

describe("Basic Test Environment", () => {
	it("should work with basic assertions", () => {
		expect(1 + 1).toBe(2);
	});

	it("should have global objects available", () => {
		expect(typeof global).toBe("object");
		expect(typeof window).toBe("object");
	});

	it("should have testing library globals", () => {
		expect(typeof expect).toBe("function");
	});
});
