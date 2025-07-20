import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the inngest modules
vi.mock("@/lib/inngest-factory", () => ({
	createInngestClient: vi.fn(() => ({
		id: "clonedex",
		send: vi.fn(() => Promise.resolve({ ids: ["test-id"] })),
	})),
	createTaskChannel: vi.fn(() => {
		const channel = {
			status: vi.fn(),
			update: vi.fn(),
			control: vi.fn(),
		};
		return channel;
	}),
	createInngestFunctions: vi.fn(() => ({
		taskControl: {
			id: "task-control",
			trigger: { event: "clonedx/task.control" },
			handler: vi.fn(() => Promise.resolve({ success: true })),
		},
		createTask: {
			id: "create-task",
			trigger: { event: "clonedx/create.task" },
			handler: vi.fn(() => Promise.resolve({ message: "Task created" })),
		},
	})),
}));

vi.mock("@/lib/inngest-instance", () => {
	const mockInngest = {
		id: "clonedx",
		send: vi.fn(() => Promise.resolve({ ids: ["test-id"] })),
	};

	const mockTaskChannel = vi.fn();
	mockTaskChannel.status = vi.fn();
	mockTaskChannel.update = vi.fn();
	mockTaskChannel.control = vi.fn();

	return {
		inngest: mockInngest,
		taskChannel: mockTaskChannel,
		taskControl: {
			id: "task-control",
			trigger: { event: "clonedx/task.control" },
			handler: vi.fn(() => Promise.resolve({ success: true })),
		},
		createTask: {
			id: "create-task",
			trigger: { event: "clonedx/create.task" },
			handler: vi.fn(() => Promise.resolve({ message: "Task created" })),
		},
		getInngest: vi.fn(() => mockInngest),
		getTaskChannel: vi.fn(() => mockTaskChannel),
		getInngestFunctions: vi.fn(() => ({
			taskControl: {
				id: "task-control",
				trigger: { event: "clonedx/task.control" },
				handler: vi.fn(() => Promise.resolve({ success: true })),
			},
			createTask: {
				id: "create-task",
				trigger: { event: "clonedx/create.task" },
				handler: vi.fn(() => Promise.resolve({ message: "Task created" })),
			},
		})),
	};
});

vi.mock("@/lib/inngest", () => {
	const mockInngest = {
		id: "clonedex",
		send: vi.fn(() => Promise.resolve({ ids: ["test-id"] })),
	};

	const mockTaskChannel = vi.fn();
	mockTaskChannel.status = vi.fn();
	mockTaskChannel.update = vi.fn();
	mockTaskChannel.control = vi.fn();

	return {
		inngest: mockInngest,
		taskChannel: mockTaskChannel,
		taskControl: {
			id: "task-control",
			trigger: { event: "clonedx/task.control" },
			handler: vi.fn(() => Promise.resolve({ success: true })),
		},
		createTask: {
			id: "create-task",
			trigger: { event: "clonedx/create.task" },
			handler: vi.fn(() => Promise.resolve({ message: "Task created" })),
		},
		getInngestApp: vi.fn(() => ({
			id: typeof global !== "undefined" && global.window ? "client" : "server",
			send: vi.fn(() => Promise.resolve({ ids: ["test-id"] })),
		})),
	};
});

describe("inngest mock validation (Vitest)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("factory module mocks", () => {
		it("should have mocked createInngestClient", async () => {
			const { createInngestClient } = await import("@/lib/inngest-factory");
			expect(createInngestClient).toBeDefined();

			const client = createInngestClient();
			expect(client).toBeDefined();
			expect(client.id).toBe("clonedex");
		});

		it("should have mocked createTaskChannel", async () => {
			const { createTaskChannel } = await import("@/lib/inngest-factory");
			expect(createTaskChannel).toBeDefined();

			const channel = createTaskChannel();
			expect(channel).toBeDefined();
			expect(channel.status).toBeDefined();
			expect(channel.update).toBeDefined();
			expect(channel.control).toBeDefined();
		});

		it("should have mocked createInngestFunctions", async () => {
			const { createInngestFunctions } = await import("@/lib/inngest-factory");
			expect(createInngestFunctions).toBeDefined();

			const functions = createInngestFunctions({} as any);
			expect(functions.taskControl).toBeDefined();
			expect(functions.createTask).toBeDefined();
		});
	});

	describe("instance module mocks", () => {
		it("should have mocked inngest instance", async () => {
			const { inngest } = await import("@/lib/inngest-instance");
			expect(inngest).toBeDefined();
			expect(inngest.id).toBe("clonedex");
		});

		it("should have mocked taskChannel", async () => {
			const { taskChannel } = await import("@/lib/inngest-instance");
			expect(taskChannel).toBeDefined();

			// The taskChannel should be a function that returns an object with methods
			// In this case, since it's mocked, we'll just verify it exists and is callable
			expect(typeof taskChannel).toBe("function");
		});

		it("should have mocked task functions", async () => {
			const { taskControl, createTask } = await import(
				"@/lib/inngest-instance"
			);

			expect(taskControl).toBeDefined();
			expect(taskControl.id).toBe("task-control");
			expect(taskControl.trigger).toEqual({ event: "clonedx/task.control" });

			expect(createTask).toBeDefined();
			expect(createTask.id).toBe("create-task");
			expect(createTask.trigger).toEqual({ event: "clonedx/create.task" });
		});

		it("should have mocked getters", async () => {
			const { getInngest, getTaskChannel, getInngestFunctions } = await import(
				"@/lib/inngest-instance"
			);

			const inngest = getInngest();
			expect(inngest.id).toBe("clonedex");

			const channel = getTaskChannel();
			expect(channel).toBeDefined();

			const functions = getInngestFunctions();
			expect(functions.taskControl).toBeDefined();
			expect(functions.createTask).toBeDefined();
		});
	});

	describe("async operations", () => {
		it("should handle inngest.send without hanging", async () => {
			const { inngest } = await import("@/lib/inngest-instance");

			const result = await inngest.send({
				name: "test.event",
				data: { test: true },
			});

			expect(result).toEqual({ ids: ["test-id"] });
		});

		it("should handle taskControl.handler without hanging", async () => {
			const { taskControl } = await import("@/lib/inngest-instance");

			const result = await taskControl.handler();
			expect(result).toEqual({ success: true });
		});

		it("should handle createTask.handler without hanging", async () => {
			const { createTask } = await import("@/lib/inngest-instance");

			const result = await createTask.handler();
			expect(result).toEqual({ message: "Task created" });
		});
	});

	describe("main module exports", () => {
		it("should have all exports from main inngest module", async () => {
			const { inngest, taskChannel, taskControl, createTask, getInngestApp } =
				await import("@/lib/inngest");

			expect(inngest).toBeDefined();
			expect(taskChannel).toBeDefined();
			expect(taskControl).toBeDefined();
			expect(createTask).toBeDefined();
			expect(getInngestApp).toBeDefined();
		});

		it("should handle getInngestApp correctly", async () => {
			const { getInngestApp } = await import("@/lib/inngest");

			// Test server environment (default)
			const serverApp = getInngestApp();
			expect(serverApp).toBeDefined();
			expect(serverApp.id).toBe("server");
		});
	});
});
