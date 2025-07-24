import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiService } from "./ApiService";

describe.skip("ApiService", () => {
	it("should work correctly", () => {
		const result = ApiService();
		expect(result).toBeDefined();
	});
});
