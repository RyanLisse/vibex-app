import { type Span, SpanStatusCode, trace } from "@opentelemetry/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BaseAPIError,
	DatabaseError,
	ValidationError,
} from "@/lib/api/base/errors";
import {
	BaseAPIService,
	BaseCRUDService,
	type ServiceContext,
	type ServiceOptions,
} from "@/lib/api/base/service";
import { observability } from "@/lib/observability";

// Mock observability
vi.mock("@/lib/observability", () => ({
	observability: {
		metrics: {
			queryDuration: vi.fn(),
			errorRate: vi.fn(),
		},
		events: {
			collector: {
				collectEvent: vi.fn().mockResolvedValue(undefined),
			},
		},
	},
}));

// Mock OpenTelemetry
const mockSpan: Partial<Span> = {
	setAttributes: vi.fn(),
	recordException: vi.fn(),
	setStatus: vi.fn(),
	end: vi.fn(),
};

const mockTracer = {
	startSpan: vi.fn().mockReturnValue(mockSpan),
};

vi.mock("@opentelemetry/api", async () => {
	const actual = await vi.importActual("@opentelemetry/api");
	return {
		...actual,
		trace: {
			getTracer: vi.fn().mockReturnValue(mockTracer),
		},
	};
});

// Test implementation of BaseAPIService
class TestService extends BaseAPIService {
	constructor() {
		super({ serviceName: "test-service" });
	}

	async publicExecuteWithTracing<T>(
		operation: string,
		context: ServiceContext,
		fn: (span: Span) => Promise<T>,
	): Promise<T> {
		return this.executeWithTracing(operation, context, fn);
	}

	async publicExecuteDatabase<T>(
		operation: string,
		fn: () => Promise<T>,
	): Promise<T> {
		return this.executeDatabase(operation, fn);
	}

	async publicRecordEvent(
		action: string,
		message: string,
		data?: Record<string, any>,
	) {
		return this.recordEvent(action, message, data);
	}
}

// Test implementation of BaseCRUDService
interface TestEntity {
	id: string;
	name: string;
	createdAt: Date;
}

interface CreateTestDTO {
	name: string;
}

interface UpdateTestDTO {
	name?: string;
}

class TestCRUDService extends BaseCRUDService<
	TestEntity,
	CreateTestDTO,
	UpdateTestDTO
> {
	protected tableName = "test_entities";

	constructor() {
		super({ serviceName: "test-crud-service" });
	}

	async getAll(
		filters: Record<string, any>,
		pagination: { page: number; limit: number },
		context: ServiceContext,
	): Promise<{ items: TestEntity[]; total: number }> {
		return this.executeWithTracing("getAll", context, async () => {
			// Mock implementation
			return {
				items: [
					{ id: "1", name: "Test 1", createdAt: new Date() },
					{ id: "2", name: "Test 2", createdAt: new Date() },
				],
				total: 2,
			};
		});
	}

	async getById(id: string, context: ServiceContext): Promise<TestEntity> {
		return this.executeWithTracing("getById", context, async () => {
			if (id === "not-found") {
				throw new BaseAPIError("Entity not found", { statusCode: 404 });
			}
			return { id, name: "Test Entity", createdAt: new Date() };
		});
	}

	async create(
		data: CreateTestDTO,
		context: ServiceContext,
	): Promise<TestEntity> {
		return this.executeWithTracing("create", context, async () => {
			return {
				id: crypto.randomUUID(),
				name: data.name,
				createdAt: new Date(),
			};
		});
	}

	async update(
		id: string,
		data: UpdateTestDTO,
		context: ServiceContext,
	): Promise<TestEntity> {
		return this.executeWithTracing("update", context, async () => {
			return {
				id,
				name: data.name || "Updated",
				createdAt: new Date(),
			};
		});
	}

	async delete(id: string, context: ServiceContext): Promise<void> {
		return this.executeWithTracing("delete", context, async () => {
			// Mock delete operation
		});
	}
}

describe("BaseAPIService Integration Tests", () => {
	let service: TestService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new TestService();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("Service Initialization", () => {
		it("should initialize with correct tracer", () => {
			expect(trace.getTracer).toHaveBeenCalledWith("test-service-api");
		});

		it("should allow custom tracer name", () => {
			vi.clearAllMocks();
			class CustomService extends BaseAPIService {
				constructor() {
					super({ serviceName: "custom", tracerName: "custom-tracer" });
				}
			}
			new CustomService();
			expect(trace.getTracer).toHaveBeenCalledWith("custom-tracer");
		});
	});

	describe("executeWithTracing", () => {
		const context: ServiceContext = {
			userId: "user-123",
			sessionId: "session-456",
			requestId: "req-789",
		};

		it("should execute operation with tracing", async () => {
			const result = await service.publicExecuteWithTracing(
				"testOperation",
				context,
				async () => {
					return { success: true };
				},
			);

			expect(result).toEqual({ success: true });
			expect(mockTracer.startSpan).toHaveBeenCalledWith(
				"test-service.testOperation",
			);
			expect(mockSpan.setAttributes).toHaveBeenCalledWith({
				"service.name": "test-service",
				"operation.name": "testOperation",
				"context.userId": "user-123",
				"context.sessionId": "session-456",
				"context.requestId": "req-789",
			});
			expect(mockSpan.end).toHaveBeenCalled();
		});

		it("should record success metrics", async () => {
			await service.publicExecuteWithTracing(
				"successOperation",
				context,
				async () => "success",
			);

			expect(observability.metrics.queryDuration).toHaveBeenCalledWith(
				expect.any(Number),
				"successOperation",
				true,
				{ service: "test-service" },
			);
			expect(mockSpan.setAttributes).toHaveBeenCalledWith(
				expect.objectContaining({
					"operation.duration": expect.any(Number),
					"operation.success": true,
				}),
			);
		});

		it("should handle BaseAPIError correctly", async () => {
			const error = new ValidationError("Invalid input", [
				{ field: "name", message: "Required" },
			]);

			await expect(
				service.publicExecuteWithTracing("failOperation", context, async () => {
					throw error;
				}),
			).rejects.toThrow(error);

			expect(observability.metrics.queryDuration).toHaveBeenCalledWith(
				expect.any(Number),
				"failOperation",
				false,
				{ service: "test-service" },
			);
			expect(observability.metrics.errorRate).toHaveBeenCalledWith(
				1,
				"test-service",
				{
					operation: "failOperation",
					error_type: "VALIDATION_ERROR",
				},
			);
			expect(mockSpan.recordException).toHaveBeenCalledWith(error);
			expect(mockSpan.setStatus).toHaveBeenCalledWith({
				code: SpanStatusCode.ERROR,
				message: "Invalid input",
			});
		});

		it("should handle generic errors", async () => {
			const error = new Error("Generic error");

			await expect(
				service.publicExecuteWithTracing(
					"errorOperation",
					context,
					async () => {
						throw error;
					},
				),
			).rejects.toThrow(error);

			expect(observability.metrics.errorRate).toHaveBeenCalledWith(
				1,
				"test-service",
				{
					operation: "errorOperation",
					error_type: "UNKNOWN",
				},
			);
			expect(mockSpan.recordException).toHaveBeenCalledWith(error);
			expect(mockSpan.setStatus).toHaveBeenCalledWith({
				code: SpanStatusCode.ERROR,
				message: "Generic error",
			});
		});

		it("should handle context with undefined values", async () => {
			const partialContext: ServiceContext = {
				userId: "user-123",
				sessionId: undefined,
				requestId: "req-789",
			};

			await service.publicExecuteWithTracing(
				"partialContext",
				partialContext,
				async () => "result",
			);

			expect(mockSpan.setAttributes).toHaveBeenCalledWith(
				expect.objectContaining({
					"context.userId": "user-123",
					"context.requestId": "req-789",
					// sessionId should be omitted
				}),
			);
			expect(mockSpan.setAttributes).not.toHaveBeenCalledWith(
				expect.objectContaining({
					"context.sessionId": expect.anything(),
				}),
			);
		});

		it("should provide span to operation function", async () => {
			let capturedSpan: Span | undefined;

			await service.publicExecuteWithTracing(
				"spanCapture",
				context,
				async (span) => {
					capturedSpan = span;
					return "result";
				},
			);

			expect(capturedSpan).toBe(mockSpan);
		});

		it("should measure operation duration accurately", async () => {
			const delay = 100; // ms

			await service.publicExecuteWithTracing(
				"timedOperation",
				context,
				async () => {
					await new Promise((resolve) => setTimeout(resolve, delay));
					return "delayed result";
				},
			);

			const durationCall = (observability.metrics.queryDuration as any).mock
				.calls[0];
			const duration = durationCall[0];

			expect(duration).toBeGreaterThanOrEqual(delay);
			expect(duration).toBeLessThan(delay + 50); // Allow some margin
		});
	});

	describe("executeDatabase", () => {
		it("should execute database operation successfully", async () => {
			const result = await service.publicExecuteDatabase(
				"dbQuery",
				async () => ({
					id: 1,
					name: "Test",
				}),
			);

			expect(result).toEqual({ id: 1, name: "Test" });
		});

		it("should wrap database errors", async () => {
			const dbError = new Error("Connection refused");

			await expect(
				service.publicExecuteDatabase("dbOperation", async () => {
					throw dbError;
				}),
			).rejects.toThrow(DatabaseError);

			try {
				await service.publicExecuteDatabase("dbOperation", async () => {
					throw dbError;
				});
			} catch (error) {
				expect(error).toBeInstanceOf(DatabaseError);
				expect((error as DatabaseError).message).toBe(
					"Database operation failed: dbOperation",
				);
				expect((error as DatabaseError).details).toBe("Connection refused");
			}
		});
	});

	describe("recordEvent", () => {
		it("should record event with service context", async () => {
			await service.publicRecordEvent("user_login", "User logged in", {
				userId: "123",
				ip: "192.168.1.1",
			});

			expect(observability.events.collector.collectEvent).toHaveBeenCalledWith(
				"user_login",
				"info",
				"User logged in",
				{
					service: "test-service",
					userId: "123",
					ip: "192.168.1.1",
				},
				"api",
				["test-service", "user_login"],
			);
		});

		it("should handle event recording errors gracefully", async () => {
			const collectEventMock = vi
				.spyOn(observability.events.collector, "collectEvent")
				.mockRejectedValueOnce(new Error("Event collection failed"));

			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			await service.publicRecordEvent("test_event", "Test message");

			expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

			consoleSpy.mockRestore();
			collectEventMock.mockRestore();
		});

		it("should record event without additional data", async () => {
			await service.publicRecordEvent("simple_event", "Simple message");

			expect(observability.events.collector.collectEvent).toHaveBeenCalledWith(
				"simple_event",
				"info",
				"Simple message",
				{
					service: "test-service",
				},
				"api",
				["test-service", "simple_event"],
			);
		});
	});
});

describe("BaseCRUDService Integration Tests", () => {
	let crudService: TestCRUDService;
	const context: ServiceContext = {
		userId: "user-123",
		sessionId: "session-456",
		requestId: "req-789",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		crudService = new TestCRUDService();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("CRUD Operations", () => {
		it("should get all items with pagination", async () => {
			const result = await crudService.getAll(
				{ status: "active" },
				{ page: 1, limit: 10 },
				context,
			);

			expect(result).toHaveProperty("items");
			expect(result).toHaveProperty("total");
			expect(result.items).toHaveLength(2);
			expect(result.total).toBe(2);

			expect(mockTracer.startSpan).toHaveBeenCalledWith(
				"test-crud-service.getAll",
			);
		});

		it("should get item by ID", async () => {
			const result = await crudService.getById("123", context);

			expect(result).toMatchObject({
				id: "123",
				name: "Test Entity",
			});
			expect(result.createdAt).toBeInstanceOf(Date);

			expect(mockTracer.startSpan).toHaveBeenCalledWith(
				"test-crud-service.getById",
			);
		});

		it("should handle not found errors", async () => {
			await expect(crudService.getById("not-found", context)).rejects.toThrow(
				BaseAPIError,
			);

			expect(observability.metrics.errorRate).toHaveBeenCalledWith(
				1,
				"test-crud-service",
				{
					operation: "getById",
					error_type: "INTERNAL_ERROR",
				},
			);
		});

		it("should create new item", async () => {
			const createData: CreateTestDTO = { name: "New Entity" };
			const result = await crudService.create(createData, context);

			expect(result).toMatchObject({
				id: expect.any(String),
				name: "New Entity",
			});
			expect(result.createdAt).toBeInstanceOf(Date);

			expect(mockTracer.startSpan).toHaveBeenCalledWith(
				"test-crud-service.create",
			);
		});

		it("should update existing item", async () => {
			const updateData: UpdateTestDTO = { name: "Updated Entity" };
			const result = await crudService.update("123", updateData, context);

			expect(result).toMatchObject({
				id: "123",
				name: "Updated Entity",
			});

			expect(mockTracer.startSpan).toHaveBeenCalledWith(
				"test-crud-service.update",
			);
		});

		it("should delete item", async () => {
			await expect(crudService.delete("123", context)).resolves.toBeUndefined();

			expect(mockTracer.startSpan).toHaveBeenCalledWith(
				"test-crud-service.delete",
			);
		});
	});

	describe("Service Inheritance", () => {
		it("should inherit BaseAPIService functionality", () => {
			expect(crudService).toBeInstanceOf(BaseCRUDService);
			expect(crudService).toBeInstanceOf(BaseAPIService);
		});

		it("should use parent class tracing for all operations", async () => {
			const operations = [
				() => crudService.getAll({}, { page: 1, limit: 10 }, context),
				() => crudService.getById("1", context),
				() => crudService.create({ name: "Test" }, context),
				() => crudService.update("1", { name: "Updated" }, context),
				() => crudService.delete("1", context),
			];

			for (const operation of operations) {
				vi.clearAllMocks();
				await operation();
				expect(mockTracer.startSpan).toHaveBeenCalled();
				expect(mockSpan.end).toHaveBeenCalled();
			}
		});
	});

	describe("Error Handling in CRUD Operations", () => {
		it("should handle database errors in CRUD operations", async () => {
			// Mock a service that throws database errors
			class ErrorCRUDService extends TestCRUDService {
				async getById(
					id: string,
					context: ServiceContext,
				): Promise<TestEntity> {
					return this.executeWithTracing("getById", context, async () => {
						return this.executeDatabase("select", async () => {
							throw new Error("Connection lost");
						});
					});
				}
			}

			const errorService = new ErrorCRUDService();

			await expect(errorService.getById("123", context)).rejects.toThrow(
				DatabaseError,
			);
		});
	});
});
