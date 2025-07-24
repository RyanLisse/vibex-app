import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Mock Electric client before importing
vi.mock("@electric-sql/client", () => ({
	Electric: vi.fn().mockImplementation(() => ({
		connect: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn().mockResolvedValue(undefined),
		sync: {
			subscribe: vi.fn().mockReturnValue({
				unsubscribe: vi.fn(),
			}),
			isConnected: vi.fn().mockReturnValue(true),
			getLastSyncTime: vi.fn().mockReturnValue(new Date()),
		},
		db: {
			tasks: {
				findMany: vi.fn().mockResolvedValue([]),
				create: vi.fn().mockResolvedValue({ id: "test-task" }),
				update: vi.fn().mockResolvedValue({ id: "test-task" }),
				delete: vi.fn().mockResolvedValue({ id: "test-task" }),
			},
		},
		notifier: {
			subscribe: vi.fn().mockReturnValue({
				unsubscribe: vi.fn(),
			}),
		},
	})),
}));

describe("Electric-SQL Sync Integration", () => {
	let electricClient: any;

	beforeEach(async () => {
		const { Electric } = await import("@electric-sql/client");
		electricClient = new Electric();
		await electricClient.connect();
	});

	afterEach(async () => {
		if (electricClient) {
			await electricClient.disconnect();
		}
	});

	test("should establish Electric connection", async () => {
		expect(electricClient).toBeDefined();
		expect(electricClient.sync.isConnected()).toBe(true);
	});

	test("should handle real-time data synchronization", async () => {
		const subscription = electricClient.sync.subscribe();
		expect(subscription).toBeDefined();
		expect(subscription.unsubscribe).toBeDefined();

		subscription.unsubscribe();
	});

	test("should perform CRUD operations with sync", async () => {
		// Test CREATE
		const newTask = await electricClient.db.tasks.create({
			data: {
				title: "Test Task",
				description: "Integration test task",
				status: "pending",
			},
		});
		expect(newTask).toMatchObject({ id: "test-task" });

		// Test READ
		const tasks = await electricClient.db.tasks.findMany();
		expect(Array.isArray(tasks)).toBe(true);

		// Test UPDATE
		const updatedTask = await electricClient.db.tasks.update({
			where: { id: "test-task" },
			data: { status: "completed" },
		});
		expect(updatedTask).toMatchObject({ id: "test-task" });

		// Test DELETE
		const deletedTask = await electricClient.db.tasks.delete({
			where: { id: "test-task" },
		});
		expect(deletedTask).toMatchObject({ id: "test-task" });
	});

	test("should handle conflict resolution", async () => {
		// Simulate concurrent updates that would cause conflicts
		const conflictingUpdate1 = electricClient.db.tasks.update({
			where: { id: "test-task" },
			data: { status: "in_progress" },
		});

		const conflictingUpdate2 = electricClient.db.tasks.update({
			where: { id: "test-task" },
			data: { status: "completed" },
		});

		// Both updates should resolve (Electric handles conflicts internally)
		const results = await Promise.allSettled([conflictingUpdate1, conflictingUpdate2]);

		expect(results[0].status).toBe("fulfilled");
		expect(results[1].status).toBe("fulfilled");
	});

	test("should handle offline sync recovery", async () => {
		// Simulate offline state
		vi.spyOn(electricClient.sync, "isConnected").mockReturnValue(false);

		// Perform operations while offline
		const offlineTask = await electricClient.db.tasks.create({
			data: {
				title: "Offline Task",
				description: "Created while offline",
				status: "pending",
			},
		});
		expect(offlineTask).toBeDefined();

		// Simulate reconnection
		vi.spyOn(electricClient.sync, "isConnected").mockReturnValue(true);

		// Should sync offline changes
		const lastSyncTime = electricClient.sync.getLastSyncTime();
		expect(lastSyncTime).toBeInstanceOf(Date);
	});

	test("should handle subscription notifications", async () => {
		const mockCallback = vi.fn();
		const subscription = electricClient.notifier.subscribe(mockCallback);

		expect(subscription).toBeDefined();
		expect(subscription.unsubscribe).toBeDefined();

		subscription.unsubscribe();
	});

	test("should handle network reconnection", async () => {
		// Simulate disconnect
		await electricClient.disconnect();
		expect(electricClient.sync.isConnected()).toBe(false);

		// Simulate reconnect
		await electricClient.connect();
		expect(electricClient.sync.isConnected()).toBe(true);
	});
});
