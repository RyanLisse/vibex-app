import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ApiService } from "./ApiService";

describe.skip("ApiService", () => {
	it("should work correctly", () => {
		const result = ApiService();
		expect(result).toBeDefined();
	});
});
