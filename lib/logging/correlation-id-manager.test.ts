import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CorrelationIdManager } from "./correlation-id-manager";

describe("CorrelationIdManager", () => {
	let manager: CorrelationIdManager;

	beforeEach(() => {
		manager = CorrelationIdManager.getInstance();
	});

	describe("getInstance", () => {
		it("should return a singleton instance", () => {
			const manager1 = CorrelationIdManager.getInstance();
			const manager2 = CorrelationIdManager.getInstance();

			expect(manager1).toBe(manager2);
		});
	});

	describe("generateId", () => {
		it("should generate a UUID", () => {
			const id = manager.generateId();

			expect(id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
			);
		});

		it("should generate unique IDs", () => {
			const id1 = manager.generateId();
			const id2 = manager.generateId();

			expect(id1).not.toBe(id2);
		});
	});

	describe("withId", () => {
		it("should execute function with correlation ID", () => {
			const testId = "test-correlation-id";

			const result = manager.withId(testId, () => {
				const currentId = manager.getCurrentId();
				return currentId;
			});

			expect(result).toBe(testId);
		});

		it("should execute async function with correlation ID", async () => {
			const testId = "test-async-id";

			const result = await manager.withIdAsync(testId, async () => {
				const currentId = manager.getCurrentId();
				return Promise.resolve(currentId);
			});

			expect(result).toBe(testId);
		});
	});

	describe("getCurrentId", () => {
		it("should return undefined when no context is set", () => {
			const id = manager.getCurrentId();
			expect(id).toBeUndefined();
		});

		it("should return current correlation ID when in context", () => {
			const testId = "current-test-id";

			manager.withId(testId, () => {
				const currentId = manager.getCurrentId();
				expect(currentId).toBe(testId);
			});
		});
	});

	describe("extractFromRequest", () => {
		it("should extract correlation ID from x-correlation-id header", () => {
			const testId = "header-correlation-id";
			const mockRequest = {
				headers: new Map([["x-correlation-id", testId]]),
			} as unknown as NextRequest;
			mockRequest.headers.get = (name: string) => {
				if (name === "x-correlation-id") return testId;
				return null;
			};

			const extractedId = manager.extractFromRequest(mockRequest);
			expect(extractedId).toBe(testId);
		});

		it("should extract correlation ID from x-request-id header", () => {
			const testId = "request-id-header";
			const mockRequest = {
				headers: new Map([["x-request-id", testId]]),
			} as unknown as NextRequest;
			mockRequest.headers.get = (name: string) => {
				if (name === "x-request-id") return testId;
				return null;
			};

			const extractedId = manager.extractFromRequest(mockRequest);
			expect(extractedId).toBe(testId);
		});

		it("should extract correlation ID from x-trace-id header", () => {
			const testId = "trace-id-header";
			const mockRequest = {
				headers: new Map([["x-trace-id", testId]]),
			} as unknown as NextRequest;
			mockRequest.headers.get = (name: string) => {
				if (name === "x-trace-id") return testId;
				return null;
			};

			const extractedId = manager.extractFromRequest(mockRequest);
			expect(extractedId).toBe(testId);
		});

		it("should generate new ID when no header is present", () => {
			const mockRequest = {
				headers: new Map(),
			} as unknown as NextRequest;
			mockRequest.headers.get = () => null;

			const extractedId = manager.extractFromRequest(mockRequest);
			expect(extractedId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
			);
		});
	});

	describe("injectIntoResponse", () => {
		it("should inject correlation ID into response headers", () => {
			const testId = "response-correlation-id";
			const mockResponse = {
				headers: new Map(),
			} as unknown as Response;
			mockResponse.headers.set = vi.fn();

			manager.injectIntoResponse(mockResponse, testId);

			expect(mockResponse.headers.set).toHaveBeenCalledWith(
				"x-correlation-id",
				testId,
			);
		});
	});
});
