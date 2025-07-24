import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TestService } from "./TestService";

describe.skip("TestService", () => {
	it("should work correctly", () => {
		const result = TestService();
		expect(result).toBeDefined();
	});
});
