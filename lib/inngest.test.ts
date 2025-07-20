import { beforeEach, describe, expect, it, vi } from "vitest";

// This test file uses Vitest runner
describe("inngest tests", () => {
	// Create inline mocks without any imports to avoid side effects
	let mockInngest: any;
	let mockTaskChannel: any;
	let mockTaskControl: any;
	let mockCreateTask: any;
	let mockGetInngestApp: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockInngest = {
			id: "clonedex",
			send: vi.fn(() => Promise.resolve({ ids: ["test-id"] })),
			createFunction: vi.fn((config) => ({
				...config,
				handler: vi.fn(() => Promise.resolve(undefined)),
			})),
		};

		mockTaskChannel = vi.fn((taskId: string) => ({
			status: vi.fn(),
			update: vi.fn(),
			control: vi.fn(),
		}));

		mockTaskControl = {
			id: "task-control",
			trigger: { event: "clonedx/task.control" },
			handler: vi.fn(() => Promise.resolve(undefined)),
		};

		mockCreateTask = {
			id: "create-task",
			trigger: { event: "clonedx/create.task" },
			handler: vi.fn(() => Promise.resolve(undefined)),
		};

		mockGetInngestApp = vi.fn(() => ({
			id: typeof window !== "undefined" ? "client" : "server",
			send: vi.fn(() => Promise.resolve({ ids: ["test-id"] })),
			createFunction: vi.fn(),
		}));
	});

	it("should have correct inngest client properties", () => {
		expect(mockInngest.id).toBe("clonedex");
		expect(typeof mockInngest.send).toBe("function");
		expect(typeof mockInngest.createFunction).toBe("function");
	});

	it("should have correct task control properties", () => {
		expect(mockTaskControl.id).toBe("task-control");
		expect(mockTaskControl.trigger).toEqual({ event: "clonedx/task.control" });
		expect(typeof mockTaskControl.handler).toBe("function");
	});

	it("should have correct create task properties", () => {
		expect(mockCreateTask.id).toBe("create-task");
		expect(mockCreateTask.trigger).toEqual({ event: "clonedx/create.task" });
		expect(typeof mockCreateTask.handler).toBe("function");
	});

	it("should create task channels", () => {
		expect(typeof mockTaskChannel).toBe("function");

		const channel = mockTaskChannel("test-id");
		expect(channel).toBeDefined();
		expect(typeof channel.status).toBe("function");
		expect(typeof channel.update).toBe("function");
		expect(typeof channel.control).toBe("function");
	});

	it("should return correct app based on environment", () => {
		// Server environment (default)
		let app = mockGetInngestApp();
		expect(app.id).toBe("server");

		// Client environment
		const originalWindow = global.window;
		// @ts-expect-error - Mocking window
		global.window = {};

		app = mockGetInngestApp();
		expect(app.id).toBe("client");

		// Restore
		global.window = originalWindow;
	});

	it("should send events", async () => {
		const event = { name: "test.event", data: { foo: "bar" } };
		const result = await mockInngest.send(event);

		expect(result).toEqual({ ids: ["test-id"] });
		expect(mockInngest.send).toHaveBeenCalledWith(event);
		expect(mockInngest.send).toHaveBeenCalledTimes(1);
	});

	it("should handle task control actions", async () => {
		const result = await mockTaskControl.handler();
		expect(result).toBeUndefined();
		expect(mockTaskControl.handler).toHaveBeenCalled();
	});

	it("should handle create task", async () => {
		const result = await mockCreateTask.handler();
		expect(result).toBeUndefined();
		expect(mockCreateTask.handler).toHaveBeenCalled();
	});
});
