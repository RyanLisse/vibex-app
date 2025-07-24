import { SpanStatusCode } from "@opentelemetry/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BaseAPIError,
	ConflictError,
	DatabaseError,
	ExternalServiceError,
	ForbiddenError,
	NotFoundError,
	RateLimitError,
	UnauthorizedError,
	ValidationError,
} from "../../../lib/api/base/errors";
import { observability } from "../../../lib/observability";

// Mock observability
vi.mock("@/lib/observability", () => ({
	observability: {
		metrics: {
			errorRate: vi.fn(),
		},
		events: {
			collector: {
				collectEvent: vi.fn().mockResolvedValue(undefined),
			},
		},
	},
}));

describe("BaseAPIError Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("BaseAPIError", () => {
		it("should create error with default values", () => {
			const error = new BaseAPIError("Test error");

			expect(error.message).toBe("Test error");
			expect(error.name).toBe("BaseAPIError");
			expect(error.statusCode).toBe(500);
			expect(error.code).toBe("INTERNAL_ERROR");
			expect(error.details).toBeUndefined();
			expect(error.context).toBeUndefined();
			expect(error.timestamp).toBeInstanceOf(Date);
			expect(error.stack).toBeDefined();
		});

		it("should create error with custom options", () => {
			const options = {
				statusCode: 400,
				code: "CUSTOM_ERROR",
				details: { field: "value" },
				context: { userId: "123" },
			};
			const error = new BaseAPIError("Custom error", options);

			expect(error.statusCode).toBe(400);
			expect(error.code).toBe("CUSTOM_ERROR");
			expect(error.details).toEqual({ field: "value" });
			expect(error.context).toEqual({ userId: "123" });
		});

		it("should record error metrics", () => {
			const error = new BaseAPIError("Test error", {
				statusCode: 404,
				code: "NOT_FOUND",
			});

			expect(observability.metrics.errorRate).toHaveBeenCalledWith(1, "api_error", {
				error_code: "NOT_FOUND",
				status_code: "404",
			});
		});

		it("should record error event", async () => {
			const error = new BaseAPIError("Test error", {
				code: "TEST_ERROR",
				details: { test: true },
			});

			await vi.waitFor(() => {
				expect(observability.events.collector.collectEvent).toHaveBeenCalledWith(
					"api_error",
					"error",
					"Test error",
					expect.objectContaining({
						code: "TEST_ERROR",
						statusCode: 500,
						details: { test: true },
						stack: expect.any(String),
					}),
					"api",
					["error", "test_error"]
				);
			});
		});

		it("should serialize to JSON correctly", () => {
			const error = new BaseAPIError("Test error", {
				statusCode: 400,
				code: "TEST_ERROR",
				details: { field: "value" },
			});

			const json = error.toJSON();

			expect(json).toEqual({
				success: false,
				error: "Test error",
				code: "TEST_ERROR",
				statusCode: 400,
				details: { field: "value" },
				timestamp: error.timestamp.toISOString(),
			});
		});

		it("should record error in span", () => {
			const error = new BaseAPIError("Test error", {
				statusCode: 500,
				code: "SERVER_ERROR",
			});

			const mockSpan = {
				recordException: vi.fn(),
				setStatus: vi.fn(),
				setAttributes: vi.fn(),
			};

			error.recordInSpan(mockSpan);

			expect(mockSpan.recordException).toHaveBeenCalledWith(error);
			expect(mockSpan.setStatus).toHaveBeenCalledWith({
				code: SpanStatusCode.ERROR,
				message: "Test error",
			});
			expect(mockSpan.setAttributes).toHaveBeenCalledWith({
				"error.type": "BaseAPIError",
				"error.code": "SERVER_ERROR",
				"error.statusCode": 500,
				"error.message": "Test error",
			});
		});
	});

	describe("ValidationError", () => {
		it("should create validation error with default values", () => {
			const error = new ValidationError("Validation failed");

			expect(error.name).toBe("ValidationError");
			expect(error.statusCode).toBe(400);
			expect(error.code).toBe("VALIDATION_ERROR");
			expect(error.message).toBe("Validation failed");
		});

		it("should create validation error with validation details", () => {
			const validationErrors = [
				{ field: "email", message: "Invalid email format" },
				{ field: "password", message: "Password too short" },
			];
			const error = new ValidationError("Validation failed", validationErrors);

			expect(error.details).toEqual(validationErrors);
		});

		it("should integrate with observability", () => {
			const error = new ValidationError("Invalid input");

			expect(observability.metrics.errorRate).toHaveBeenCalledWith(1, "api_error", {
				error_code: "VALIDATION_ERROR",
				status_code: "400",
			});
		});
	});

	describe("NotFoundError", () => {
		it("should create not found error with resource name only", () => {
			const error = new NotFoundError("User");

			expect(error.name).toBe("NotFoundError");
			expect(error.statusCode).toBe(404);
			expect(error.code).toBe("NOT_FOUND");
			expect(error.message).toBe("User not found");
			expect(error.context).toEqual({ resource: "User", id: undefined });
		});

		it("should create not found error with resource and id", () => {
			const error = new NotFoundError("User", "123");

			expect(error.message).toBe("User with id 123 not found");
			expect(error.context).toEqual({ resource: "User", id: "123" });
		});

		it("should integrate with observability", () => {
			const error = new NotFoundError("Task", "abc-123");

			expect(observability.metrics.errorRate).toHaveBeenCalledWith(1, "api_error", {
				error_code: "NOT_FOUND",
				status_code: "404",
			});
		});
	});

	describe("UnauthorizedError", () => {
		it("should create unauthorized error with default message", () => {
			const error = new UnauthorizedError();

			expect(error.name).toBe("UnauthorizedError");
			expect(error.statusCode).toBe(401);
			expect(error.code).toBe("UNAUTHORIZED");
			expect(error.message).toBe("Unauthorized");
		});

		it("should create unauthorized error with custom message", () => {
			const error = new UnauthorizedError("Invalid token");

			expect(error.message).toBe("Invalid token");
		});
	});

	describe("ForbiddenError", () => {
		it("should create forbidden error with default message", () => {
			const error = new ForbiddenError();

			expect(error.name).toBe("ForbiddenError");
			expect(error.statusCode).toBe(403);
			expect(error.code).toBe("FORBIDDEN");
			expect(error.message).toBe("Forbidden");
		});

		it("should create forbidden error with custom message", () => {
			const error = new ForbiddenError("Insufficient permissions");

			expect(error.message).toBe("Insufficient permissions");
		});
	});

	describe("ConflictError", () => {
		it("should create conflict error", () => {
			const error = new ConflictError("Email already exists", {
				email: "test@example.com",
			});

			expect(error.name).toBe("ConflictError");
			expect(error.statusCode).toBe(409);
			expect(error.code).toBe("CONFLICT");
			expect(error.message).toBe("Email already exists");
			expect(error.details).toEqual({ email: "test@example.com" });
		});
	});

	describe("RateLimitError", () => {
		it("should create rate limit error without retry after", () => {
			const error = new RateLimitError();

			expect(error.name).toBe("RateLimitError");
			expect(error.statusCode).toBe(429);
			expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
			expect(error.message).toBe("Rate limit exceeded");
			expect(error.details).toEqual({ retryAfter: undefined });
		});

		it("should create rate limit error with retry after", () => {
			const error = new RateLimitError(60);

			expect(error.details).toEqual({ retryAfter: 60 });
		});
	});

	describe("DatabaseError", () => {
		it("should create database error without original error", () => {
			const error = new DatabaseError("Connection failed");

			expect(error.name).toBe("DatabaseError");
			expect(error.statusCode).toBe(500);
			expect(error.code).toBe("DATABASE_ERROR");
			expect(error.message).toBe("Connection failed");
			expect(error.details).toBeUndefined();
		});

		it("should create database error with original error", () => {
			const originalError = new Error("ECONNREFUSED");
			const error = new DatabaseError("Connection failed", originalError);

			expect(error.details).toBe("ECONNREFUSED");
		});
	});

	describe("ExternalServiceError", () => {
		it("should create external service error without original error", () => {
			const error = new ExternalServiceError("PaymentAPI");

			expect(error.name).toBe("ExternalServiceError");
			expect(error.statusCode).toBe(502);
			expect(error.code).toBe("EXTERNAL_SERVICE_ERROR");
			expect(error.message).toBe("External service error: PaymentAPI");
			expect(error.context).toEqual({ service: "PaymentAPI" });
			expect(error.details).toBeUndefined();
		});

		it("should create external service error with original error", () => {
			const originalError = new Error("Timeout");
			const error = new ExternalServiceError("EmailService", originalError);

			expect(error.details).toBe("Timeout");
		});
	});

	describe("Error Inheritance and Polymorphism", () => {
		it("should maintain instanceof relationships", () => {
			const baseError = new BaseAPIError("Base");
			const validationError = new ValidationError("Validation");
			const notFoundError = new NotFoundError("Resource");

			expect(baseError).toBeInstanceOf(BaseAPIError);
			expect(baseError).toBeInstanceOf(Error);

			expect(validationError).toBeInstanceOf(ValidationError);
			expect(validationError).toBeInstanceOf(BaseAPIError);
			expect(validationError).toBeInstanceOf(Error);

			expect(notFoundError).toBeInstanceOf(NotFoundError);
			expect(notFoundError).toBeInstanceOf(BaseAPIError);
			expect(notFoundError).toBeInstanceOf(Error);
		});

		it("should handle errors polymorphically", () => {
			const errors: BaseAPIError[] = [
				new ValidationError("Invalid input"),
				new NotFoundError("User", "123"),
				new UnauthorizedError(),
				new DatabaseError("Connection failed"),
			];

			errors.forEach((error) => {
				expect(error).toBeInstanceOf(BaseAPIError);
				expect(error.toJSON()).toHaveProperty("success", false);
				expect(error.toJSON()).toHaveProperty("code");
				expect(error.toJSON()).toHaveProperty("statusCode");
			});
		});
	});

	describe("Stack Trace Handling", () => {
		it("should capture stack trace correctly", () => {
			const error = new BaseAPIError("Test error");

			expect(error.stack).toBeDefined();
			expect(error.stack).toContain("BaseAPIError");
			expect(error.stack).toContain("base-api-error.test.ts");
		});

		it("should maintain stack trace for derived errors", () => {
			const error = new ValidationError("Invalid input");

			expect(error.stack).toBeDefined();
			expect(error.stack).toContain("ValidationError");
		});
	});

	describe("Error Chaining and Context", () => {
		it("should handle nested error scenarios", () => {
			const originalError = new Error("Connection timeout");
			const dbError = new DatabaseError("Failed to fetch user", originalError);

			expect(dbError.details).toBe("Connection timeout");
			expect(dbError.message).toBe("Failed to fetch user");
		});

		it("should preserve context through error chain", () => {
			const error = new BaseAPIError("Operation failed", {
				context: {
					userId: "123",
					action: "updateProfile",
					timestamp: new Date().toISOString(),
				},
			});

			expect(error.context).toMatchObject({
				userId: "123",
				action: "updateProfile",
			});
		});
	});

	describe("Observability Integration", () => {
		it("should handle observability errors gracefully", async () => {
			// Mock collectEvent to throw
			const collectEventMock = vi
				.spyOn(observability.events.collector, "collectEvent")
				.mockRejectedValueOnce(new Error("Observability failed"));

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const error = new BaseAPIError("Test error");

			// Wait for async operation
			await vi.waitFor(() => {
				expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
			});

			expect(error).toBeDefined(); // Error creation should not fail

			consoleSpy.mockRestore();
			collectEventMock.mockRestore();
		});

		it("should include all error details in observability events", async () => {
			const error = new BaseAPIError("Complex error", {
				statusCode: 500,
				code: "COMPLEX_ERROR",
				details: { nested: { data: "value" } },
				context: { requestId: "abc-123" },
			});

			await vi.waitFor(() => {
				expect(observability.events.collector.collectEvent).toHaveBeenCalledWith(
					"api_error",
					"error",
					"Complex error",
					expect.objectContaining({
						code: "COMPLEX_ERROR",
						statusCode: 500,
						details: { nested: { data: "value" } },
						context: { requestId: "abc-123" },
						stack: expect.any(String),
					}),
					"api",
					["error", "complex_error"]
				);
			});
		});
	});
});
