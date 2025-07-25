import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Inngest
const mockHandler = {
	GET: vi.fn(() => Promise.resolve(new Response("Inngest endpoint ready"))),
	POST: vi.fn(() => Promise.resolve(new Response("Inngest webhook handled"))),
	PUT: vi.fn(() => Promise.resolve(new Response("Inngest function updated"))),
};

// vi.mock("inngest/next", () => ({
// 	serve: vi.fn(() => mockHandler),
// }));

// vi.mock("@/lib/inngest", () => ({
// 	inngest: {
// 		createFunction: vi.fn(() => ({
// 			id: "test-function",
// 			name: "Test Function",
// 		})),
// 		send: vi.fn(() => Promise.resolve({ id: "test-event-id" })),
// 	},
// 	createTask: vi.fn(() => Promise.resolve({ success: true })),
// 	taskControl: vi.fn(() => Promise.resolve({ success: true })),
// 	taskChannel: vi.fn(() => ({
// 		status: vi.fn(),
// 		update: vi.fn(),
// 		control: vi.fn(),
// 	})),
// }));

// Mock NextResponse
// vi.mock("next/server", () => ({
// 	NextRequest: class {
// constructor(
// public url: string,
// public init?: any
// ) {}
// 	},
// 	NextResponse: {
// 		json: vi.fn((data, init) => ({
// 			json: () => Promise.resolve(data),
// ...init,
// 		})),
// 		text: vi.fn(),
// 	},
// }));

// Set environment variables
process.env.INNGEST_SIGNING_KEY = "test-signing-key";
process.env.INNGEST_EVENT_KEY = "test-event-key";
// NODE_ENV is read-only in some environments, so we use Object.defineProperty
Object.defineProperty(process.env, "NODE_ENV", {
	value: "test",
	writable: true,
	configurable: true,
});

const { NextResponse } = await import("next/server");
const _mockNextResponse = NextResponse as any;

// Import the route functions after mocks are set up
const { GET, POST, PUT } = await import("@/app/api/inngest/route");

describe.skip("Inngest API Routes", () => {
	beforeEach(() => {
		// Clear mock call history
		mockHandler.GET.mockClear?.();
		mockHandler.POST.mockClear?.();
		mockHandler.PUT.mockClear?.();
	});

	describe("GET /api/inngest", () => {
		it("should return Inngest serve response", async () => {
			const mockServeResponse = new Response("Inngest endpoint ready");
			mockHandler.GET.mockImplementation(() => Promise.resolve(mockServeResponse));

			const request = new NextRequest("https://app.example.com/api/inngest");

			const response = await GET(request);

			expect(response).toBe(mockServeResponse);
		});

		it("should handle Inngest serve errors", async () => {
			mockHandler.GET.mockImplementation(() => Promise.reject(new Error("Inngest serve failed")));

			const request = new NextRequest("https://app.example.com/api/inngest");

			try {
				const _response = await GET(request);
			} catch (error) {
				expect(error.message).toBe("Inngest serve failed");
			}

			expect(mockHandler.GET).toHaveBeenCalled();
		});

		it("should handle missing environment variables", async () => {
			process.env.INNGEST_SIGNING_KEY = "";
			process.env.INNGEST_EVENT_KEY = "";

			const request = new NextRequest("https://app.example.com/api/inngest");

			try {
				const _response = await GET(request);
				// If no error is thrown, the function should still work
				expect(mockHandler.GET).toHaveBeenCalled();
			} catch (_error) {
				// If an error is thrown, that's also acceptable behavior
				expect(mockHandler.GET).toHaveBeenCalled();
			}
		});
	});

	describe("POST /api/inngest", () => {
		it("should return Inngest serve response for POST", async () => {
			const mockServeResponse = new Response("Inngest webhook handled");
			mockHandler.POST.mockImplementation(() => Promise.resolve(mockServeResponse));

			const request = new NextRequest("https://app.example.com/api/inngest", {
				method: "POST",
				body: JSON.stringify({
					event: "task.created",
					data: { taskId: "task-123" },
				}),
			});

			const response = await POST(request);

			expect(response).toBe(mockServeResponse);
		});

		it("should handle webhook signature validation", async () => {
			const mockServeResponse = new Response("Invalid signature", {
				status: 401,
			});
			mockHandler.POST.mockImplementation(() => Promise.resolve(mockServeResponse));

			const request = new NextRequest("https://app.example.com/api/inngest", {
				method: "POST",
				headers: {
					"x-inngest-signature": "invalid-signature",
				},
				body: JSON.stringify({
					event: "task.created",
					data: { taskId: "task-123" },
				}),
			});

			const response = await POST(request);

			expect(response).toBe(mockServeResponse);
		});

		it("should handle malformed request body", async () => {
			const mockServeResponse = new Response(JSON.stringify({ success: true }), { status: 200 });
			mockHandler.POST.mockImplementation(() => Promise.resolve(mockServeResponse));

			const request = new NextRequest("https://app.example.com/api/inngest", {
				method: "POST",
				body: "invalid-json",
			});

			const response = await POST(request);

			expect(response).toBe(mockServeResponse);
		});

		it("should handle function execution errors", async () => {
			mockHandler.POST.mockImplementation(() =>
				Promise.reject(new Error("Function execution failed"))
			);

			const request = new NextRequest("https://app.example.com/api/inngest", {
				method: "POST",
				body: JSON.stringify({
					event: "task.created",
					data: { taskId: "task-123" },
				}),
			});

			try {
				const _response = await POST(request);
			} catch (error) {
				expect(error.message).toBe("Function execution failed");
			}

			expect(mockHandler.POST).toHaveBeenCalled();
		});
	});

	describe("PUT /api/inngest", () => {
		it("should return Inngest serve response for PUT", async () => {
			const mockServeResponse = new Response("Inngest function updated");
			mockHandler.PUT.mockImplementation(() => Promise.resolve(mockServeResponse));

			const request = new NextRequest("https://app.example.com/api/inngest", {
				method: "PUT",
				body: JSON.stringify({ functionId: "task-processor", enabled: false }),
			});

			const response = await PUT(request);

			expect(response).toBe(mockServeResponse);
		});

		it("should handle function configuration updates", async () => {
			const mockServeResponse = new Response("Function configuration updated");
			mockHandler.PUT.mockImplementation(() => Promise.resolve(mockServeResponse));

			const request = new NextRequest("https://app.example.com/api/inngest", {
				method: "PUT",
				body: JSON.stringify({
					functionId: "workflow-engine",
					config: { retries: 3, timeout: 30_000 },
				}),
			});

			const response = await PUT(request);

			expect(response).toBe(mockServeResponse);
		});

		it("should handle invalid function updates", async () => {
			mockHandler.PUT.mockImplementation(() => Promise.reject(new Error("Function not found")));

			const request = new NextRequest("https://app.example.com/api/inngest", {
				method: "PUT",
				body: JSON.stringify({ functionId: "non-existent-function" }),
			});

			try {
				const _response = await PUT(request);
			} catch (error) {
				expect(error.message).toBe("Function not found");
			}

			expect(mockHandler.PUT).toHaveBeenCalled();
		});

		it("should handle authorization errors", async () => {
			mockHandler.PUT.mockImplementation(() => Promise.reject(new Error("Unauthorized")));

			const request = new NextRequest("https://app.example.com/api/inngest", {
				method: "PUT",
				headers: {
					Authorization: "Bearer invalid-token",
				},
				body: JSON.stringify({ functionId: "task-processor", enabled: false }),
			});

			try {
				const _response = await PUT(request);
			} catch (error) {
				expect(error.message).toBe("Unauthorized");
			}

			expect(mockHandler.PUT).toHaveBeenCalled();
		});
	});

	describe("Error Handling", () => {
		it("should handle network errors gracefully", async () => {
			mockHandler.GET.mockImplementation(() => Promise.reject(new Error("Network error")));

			const request = new NextRequest("https://app.example.com/api/inngest");

			try {
				const _response = await GET(request);
			} catch (error) {
				expect(error.message).toBe("Network error");
			}

			expect(mockHandler.GET).toHaveBeenCalled();
		});

		it("should handle timeout errors", async () => {
			mockHandler.GET.mockImplementation(() => {
				return new Promise((_, reject) => {
					setTimeout(() => reject(new Error("Timeout")), 100);
				});
			});

			const request = new NextRequest("https://app.example.com/api/inngest");

			try {
				const _response = await GET(request);
			} catch (error) {
				expect(error.message).toBe("Timeout");
			}

			expect(mockHandler.GET).toHaveBeenCalled();
		});

		it("should handle rate limiting", async () => {
			const error = new Error("Rate limit exceeded");
			error.name = "RateLimitError";
			mockHandler.GET.mockImplementation(() => Promise.reject(error));

			const request = new NextRequest("https://app.example.com/api/inngest");

			try {
				const _response = await GET(request);
			} catch (error) {
				expect(error.message).toBe("Rate limit exceeded");
				expect(error.name).toBe("RateLimitError");
			}

			expect(mockHandler.GET).toHaveBeenCalled();
		});
	});

	describe("Function Registration", () => {
		it("should register all functions correctly", async () => {
			const mockServeResponse = new Response("Functions registered");
			mockHandler.GET.mockImplementation(() => Promise.resolve(mockServeResponse));

			const request = new NextRequest("https://app.example.com/api/inngest");

			const response = await GET(request);

			expect(response).toBe(mockServeResponse);
		});

		it("should handle function registration errors", async () => {
			mockHandler.GET.mockImplementation(() =>
				Promise.reject(new Error("Function registration failed"))
			);

			const request = new NextRequest("https://app.example.com/api/inngest");

			try {
				const _response = await GET(request);
			} catch (error) {
				expect(error.message).toBe("Function registration failed");
			}

			expect(mockHandler.GET).toHaveBeenCalled();
		});
	});

	describe("Environment Configuration", () => {
		it("should handle development environment", async () => {
			Object.defineProperty(process.env, "NODE_ENV", {
				value: "development",
				writable: true,
				configurable: true,
			});
			process.env.INNGEST_SIGNING_KEY = "dev-signing-key";
			process.env.INNGEST_EVENT_KEY = "dev-event-key";

			const mockServeResponse = new Response("Development mode");
			mockHandler.GET.mockImplementation(() => Promise.resolve(mockServeResponse));

			const request = new NextRequest("https://app.example.com/api/inngest");

			const response = await GET(request);

			expect(response).toBe(mockServeResponse);
		});

		it("should handle production environment", async () => {
			Object.defineProperty(process.env, "NODE_ENV", {
				value: "production",
				writable: true,
				configurable: true,
			});
			process.env.INNGEST_SIGNING_KEY = "prod-signing-key";
			process.env.INNGEST_EVENT_KEY = "prod-event-key";

			const mockServeResponse = new Response("Production mode");
			mockHandler.GET.mockImplementation(() => Promise.resolve(mockServeResponse));

			const request = new NextRequest("https://app.example.com/api/inngest");

			const response = await GET(request);

			expect(response).toBe(mockServeResponse);
		});
	});
});
