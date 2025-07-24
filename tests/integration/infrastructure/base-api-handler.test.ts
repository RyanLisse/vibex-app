import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { BaseAPIError, ValidationError } from "../../../lib/api/base/errors";
import {
	BaseAPIHandler,
	type HandlerOptions,
	type RequestContext,
} from "../../../lib/api/base/handler";
import { ResponseBuilder } from "../../../lib/api/base/response-builder";
import { observability } from "../../../lib/observability";

// Mock observability
vi.mock("@/lib/observability", () => ({
	observability: {
		metrics: {
			httpRequestDuration: vi.fn(),
		},
	},
}));

// Mock NextResponse
vi.mock("next/server", async () => {
	const actual = await vi.importActual("next/server");
	return {
		...actual,
		NextResponse: {
			json: vi.fn((body, init) => ({
				body,
				status: init?.status || 200,
				headers: new Headers(init?.headers || {}),
			})),
		},
	};
});

// Helper to create NextRequest
function createRequest(
	url: string,
	options: {
		method?: string;
		headers?: Record<string, string>;
		body?: any;
		searchParams?: Record<string, string>;
	} = {}
) {
	const fullUrl = new URL(url, "http://localhost:3000");

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			fullUrl.searchParams.append(key, value);
		});
	}

	const headers = new Headers(options.headers || {});

	const init: RequestInit = {
		method: options.method || "GET",
		headers,
	};

	if (options.body) {
		init.body = JSON.stringify(options.body);
		headers.set("content-type", "application/json");
	}

	const request = new NextRequest(fullUrl, init);

	// Mock the json() method
	if (options.body) {
		(request as any).json = vi.fn().mockResolvedValue(options.body);
	}
	// Mock cookies
	(request as any).cookies = {
		get: vi.fn((name: string) => {
			if (name === "auth_token" && options.headers?.["x-auth-token"]) {
				return { value: options.headers["x-auth-token"] };
			}
			return undefined;
		}),
	};

	return request;
}

describe("BaseAPIHandler Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("handle method", () => {
		it("should handle successful request", async () => {
			const request = createRequest("/api/test");
			const handler = async (context: RequestContext) => {
				return { message: "Success", data: { id: 1 } };
			};

			const response = await BaseAPIHandler.handle(request, handler);

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				success: true,
				data: { message: "Success", data: { id: 1 } },
				meta: expect.objectContaining({
					timestamp: expect.any(String),
					version: "1.0.0",
					requestId: expect.any(String),
				}),
			});

			expect(observability.metrics.httpRequestDuration).toHaveBeenCalledWith(
				expect.any(Number),
				"GET",
				"/api/test",
				200
			);
		});

		it("should create proper request context", async () => {
			const request = createRequest("/api/users", {
				method: "POST",
				headers: {
					"x-custom-header": "custom-value",
					"user-agent": "test-agent",
				},
				searchParams: {
					filter: "active",
					page: "1",
				},
			});

			let capturedContext: RequestContext | undefined;

			const handler = async (context: RequestContext) => {
				capturedContext = context;
				return { success: true };
			};

			await BaseAPIHandler.handle(request, handler);

			expect(capturedContext).toBeDefined();
			expect(capturedContext!.method).toBe("POST");
			expect(capturedContext!.path).toBe("/api/users");
			expect(capturedContext!.query).toEqual({
				filter: "active",
				page: "1",
			});
			expect(capturedContext!.headers).toMatchObject({
				"x-custom-header": "custom-value",
				"user-agent": "test-agent",
			});
			expect(capturedContext!.requestId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
			);
		});

		it("should handle BaseAPIError correctly", async () => {
			const request = createRequest("/api/test");
			const error = new ValidationError("Validation failed", [
				{ field: "email", message: "Invalid format" },
			]);

			const handler = async () => {
				throw error;
			};

			const response = await BaseAPIHandler.handle(request, handler);

			expect(response.status).toBe(400);
			expect(response.body).toMatchObject({
				success: false,
				error: "Validation failed",
				code: "VALIDATION_ERROR",
				statusCode: 400,
				details: [{ field: "email", message: "Invalid format" }],
				timestamp: expect.any(String),
				meta: expect.objectContaining({
					requestId: expect.any(String),
					version: "1.0.0",
				}),
			});

			expect(observability.metrics.httpRequestDuration).toHaveBeenCalledWith(
				expect.any(Number),
				"GET",
				"/api/test",
				400
			);
		});

		it("should handle unexpected errors", async () => {
			const request = createRequest("/api/test");
			const handler = async () => {
				throw new Error("Unexpected error occurred");
			};

			const response = await BaseAPIHandler.handle(request, handler);

			expect(response.status).toBe(500);
			expect(response.body).toMatchObject({
				success: false,
				error: "Internal server error",
				code: "INTERNAL_ERROR",
				statusCode: 500,
				details: "Unexpected error occurred",
				meta: expect.objectContaining({
					requestId: expect.any(String),
					version: "1.0.0",
				}),
			});
		});

		it("should handle non-Error throws", async () => {
			const request = createRequest("/api/test");
			const handler = async () => {
				throw "String error"; // Non-Error object
			};

			const response = await BaseAPIHandler.handle(request, handler);

			expect(response.status).toBe(500);
			expect(response.body).toMatchObject({
				success: false,
				error: "Internal server error",
				code: "INTERNAL_ERROR",
				statusCode: 500,
				details: "Unknown error",
			});
		});
	});

	describe("Authentication handling", () => {
		it("should check authentication when required", async () => {
			const request = createRequest("/api/protected", {
				headers: { "x-auth-token": "valid-token" },
			});

			let capturedContext: RequestContext | undefined;

			const handler = async (context: RequestContext) => {
				capturedContext = context;
				return { protected: true };
			};

			const options: HandlerOptions = { requireAuth: true };
			const response = await BaseAPIHandler.handle(request, handler, options);

			expect(response.status).toBe(200);
			expect(capturedContext).toBeDefined();
			expect(capturedContext!.userId).toBe("mock-user-id");
			expect(capturedContext!.sessionId).toBe("mock-session-id");
		});

		it("should reject unauthenticated requests", async () => {
			const request = createRequest("/api/protected");

			const handler = async () => ({ data: "should not reach here" });
			const options: HandlerOptions = { requireAuth: true };

			const response = await BaseAPIHandler.handle(request, handler, options);

			expect(response.status).toBe(401);
			expect(response.body).toMatchObject({
				success: false,
				error: "Authentication required",
				code: "AUTHENTICATION_REQUIRED",
				statusCode: 401,
			});
		});

		it("should check authorization header", async () => {
			const request = (createRequest("/api/protected", {
				headers: { authorization: "Bearer test-token" },
			})(
				// Mock the cookies.get to return undefined
				request as any
			).cookies.get = vi.fn().mockReturnValue(undefined));

			const handler = async (context: RequestContext) => {
				return { authenticated: true, userId: context.userId };
			};

			const options: HandlerOptions = { requireAuth: true };
			const response = await BaseAPIHandler.handle(request, handler, options);

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({
				authenticated: true,
				userId: "mock-user-id",
			});
		});
	});

	describe("validateBody", () => {
		const schema = z.object({
			name: z.string().min(3),
			age: z.number().min(18),
			email: z.string().email(),
		});

		it("should validate valid request body", async () => {
			const validBody = {
				name: "John Doe",
				age: 25,
				email: "john@example.com",
			};

			const request = createRequest("/api/users", {
				method: "POST",
				body: validBody,
			});

			const result = await BaseAPIHandler.validateBody(request, schema);

			expect(result).toEqual(validBody);
		});

		it("should throw ValidationError for invalid body", async () => {
			const invalidBody = {
				name: "Jo", // Too short
				age: 16, // Too young
				email: "invalid-email",
			};

			const request = createRequest("/api/users", {
				method: "POST",
				body: invalidBody,
			});

			await expect(BaseAPIHandler.validateBody(request, schema)).rejects.toThrow(ValidationError);

			try {
				await BaseAPIHandler.validateBody(request, schema);
			} catch (error) {
				expect(error).toBeInstanceOf(ValidationError);
				const validationError = error as ValidationError;
				expect(validationError.details).toContainEqual(
					expect.objectContaining({
						field: "name",
						message: expect.any(String),
						code: expect.any(String),
					})
				);
				expect(validationError.details).toContainEqual(
					expect.objectContaining({
						field: "age",
						message: expect.any(String),
					})
				);
				expect(validationError.details).toContainEqual(
					expect.objectContaining({
						field: "email",
						message: expect.any(String),
					})
				);
			}
		});

		it("should handle JSON parsing errors", async () => {
			const request = (createRequest("/api/users", {
				method: "POST",
			})(
				// Mock json() to throw
				request as any
			).json = vi.fn().mockRejectedValue(new Error("Invalid JSON")));

			await expect(BaseAPIHandler.validateBody(request, schema)).rejects.toThrow(ValidationError);

			try {
				await BaseAPIHandler.validateBody(request, schema);
			} catch (error) {
				expect(error).toBeInstanceOf(ValidationError);
				expect((error as ValidationError).message).toBe("Invalid request body");
			}
		});
	});

	describe("validateQuery", () => {
		const querySchema = z.object({
			page: z.coerce.number().min(1).default(1),
			limit: z.coerce.number().min(1).max(100).default(10),
			sort: z.enum(["asc", "desc"]).optional(),
		});

		it("should validate valid query parameters", () => {
			const searchParams = new URLSearchParams({
				page: "2",
				limit: "20",
				sort: "asc",
			});

			const result = BaseAPIHandler.validateQuery(searchParams, querySchema);

			expect(result).toEqual({
				page: 2,
				limit: 20,
				sort: "asc",
			});
		});

		it("should apply default values", () => {
			const searchParams = new URLSearchParams();

			const result = BaseAPIHandler.validateQuery(searchParams, querySchema);

			expect(result).toEqual({
				page: 1,
				limit: 10,
			});
		});

		it("should throw ValidationError for invalid query params", () => {
			const searchParams = new URLSearchParams({
				page: "0", // Less than minimum
				limit: "150", // More than maximum
				sort: "invalid", // Not in enum
			});

			expect(() => BaseAPIHandler.validateQuery(searchParams, querySchema)).toThrow(
				ValidationError
			);

			try {
				BaseAPIHandler.validateQuery(searchParams, querySchema);
			} catch (error) {
				expect(error).toBeInstanceOf(ValidationError);
				const validationError = error as ValidationError;
				expect(validationError.message).toBe("Invalid query parameters");
				expect(validationError.details).toHaveLength(3);
			}
		});
	});

	describe("HTTP method handlers", () => {
		const testHandler = async (context: RequestContext) => ({
			method: context.method,
			path: context.path,
		});

		it("should handle GET requests", async () => {
			const handler = BaseAPIHandler.GET(testHandler);
			const request = createRequest("/api/test", { method: "GET" });

			const response = await handler(request);

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({
				method: "GET",
				path: "/api/test",
			});
		});

		it("should handle POST requests", async () => {
			const handler = BaseAPIHandler.POST(testHandler);
			const request = createRequest("/api/test", { method: "POST" });

			const response = await handler(request);

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({
				method: "POST",
				path: "/api/test",
			});
		});

		it("should handle PUT requests", async () => {
			const handler = BaseAPIHandler.PUT(testHandler);
			const request = createRequest("/api/test", { method: "PUT" });

			const response = await handler(request);

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({
				method: "PUT",
				path: "/api/test",
			});
		});

		it("should handle DELETE requests", async () => {
			const handler = BaseAPIHandler.DELETE(testHandler);
			const request = createRequest("/api/test", { method: "DELETE" });

			const response = await handler(request);

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({
				method: "DELETE",
				path: "/api/test",
			});
		});

		it("should handle PATCH requests", async () => {
			const handler = BaseAPIHandler.PATCH(testHandler);
			const request = createRequest("/api/test", { method: "PATCH" });

			const response = await handler(request);

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({
				method: "PATCH",
				path: "/api/test",
			});
		});

		it("should pass options to method handlers", async () => {
			const protectedHandler = async (context: RequestContext) => ({
				userId: context.userId,
				protected: true,
			});

			const handler = BaseAPIHandler.GET(protectedHandler, {
				requireAuth: true,
			});
			const request = createRequest("/api/protected", {
				headers: { "x-auth-token": "valid-token" },
			});

			const response = await handler(request);

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({
				userId: "mock-user-id",
				protected: true,
			});
		});
	});

	describe("Complex request handling scenarios", () => {
		it("should handle request with body and query params", async () => {
			const bodySchema = z.object({
				title: z.string(),
				content: z.string(),
			});

			const querySchema = z.object({
				draft: z.coerce.boolean().optional(),
			});

			const request = createRequest("/api/posts", {
				method: "POST",
				body: {
					title: "Test Post",
					content: "This is a test post",
				},
				searchParams: {
					draft: "true",
				},
				headers: {
					"x-auth-token": "valid-token",
				},
			});

			const handler = async (context: RequestContext) => {
				const body = await BaseAPIHandler.validateBody(request, bodySchema);
				const query = BaseAPIHandler.validateQuery(request.nextUrl.searchParams, querySchema);

				return {
					post: {
						...body,
						isDraft: query.draft,
						author: context.userId,
					},
				};
			};

			const response = await BaseAPIHandler.handle(request, handler, {
				requireAuth: true,
			});

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({
				post: {
					title: "Test Post",
					content: "This is a test post",
					isDraft: true,
					author: "mock-user-id",
				},
			});
		});

		it("should handle async validation errors", async () => {
			const request = createRequest("/api/test", {
				method: "POST",
				body: { data: "test" },
			});

			const handler = async () => {
				// Simulate async validation that fails
				await new Promise((resolve) => setTimeout(resolve, 10));
				throw new ValidationError("Async validation failed");
			};

			const response = await BaseAPIHandler.handle(request, handler);

			expect(response.status).toBe(400);
			expect(response.body).toMatchObject({
				success: false,
				error: "Async validation failed",
				code: "VALIDATION_ERROR",
			});
		});

		it("should measure request duration accurately", async () => {
			const delay = 50; // ms
			const request = createRequest("/api/slow");

			const handler = async () => {
				await new Promise((resolve) => setTimeout(resolve, delay));
				return { processed: true };
			};

			await BaseAPIHandler.handle(request, handler);

			const durationCall = (observability.metrics.httpRequestDuration as any).mock.calls[0];
			const duration = durationCall[0];

			expect(duration).toBeGreaterThanOrEqual(delay);
			expect(duration).toBeLessThan(delay + 20); // Allow some margin
		});
	});
});
