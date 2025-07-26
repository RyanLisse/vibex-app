import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TestService } from "./TestService";

describe.skip("TestService", () => {
	it("should work correctly", () => {
		const result = TestService();
		expect(result).toBeDefined();
	});
});
