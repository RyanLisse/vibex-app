import { beforeEach, describe, expect, it, vi } from "vitest";

// Try to use vi.fn() instead of vi.mock()
describe("Simple Mock Test", () => {
	let mockFunction: any;

	beforeEach(() => {
		mockFunction = vi.fn();
	});

	it("should work with vi.fn()", () => {
		mockFunction("test");
		expect(mockFunction).toHaveBeenCalledWith("test");
	});

	it("should check vi availability", () => {
		console.log("vi object:", typeof vi);
		console.log("vi.fn:", typeof vi.fn);
		console.log("vi.mock:", typeof vi.mock);
		console.log("vi.spyOn:", typeof vi.spyOn);

		expect(vi).toBeDefined();
		expect(vi.fn).toBeDefined();
	});
});
