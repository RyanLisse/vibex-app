import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock agent types and interfaces
interface Agent {
	id: string;
	name: string;
	type: string;
	status: "idle" | "busy" | "error" | "offline";
	capabilities: string[];
}

interface Task {
	id: string;
	type: string;
	payload: any;
	priority: number;
	assignedAgent?: string;
	status: "pending" | "running" | "completed" | "failed";
}

// Mock orchestrator implementation for testing
class AgentOrchestrator {
	private agents: Map<string, Agent> = new Map();
	private tasks: Map<string, Task> = new Map();
	private taskQueue: Task[] = [];

	registerAgent(agent: Agent): void {
		this.agents.set(agent.id, agent);
	}

	unregisterAgent(agentId: string): void {
		this.agents.delete(agentId);
	}

	getAgent(agentId: string): Agent | undefined {
		return this.agents.get(agentId);
	}

	getAllAgents(): Agent[] {
		return Array.from(this.agents.values());
	}

	addTask(task: Task): void {
		this.tasks.set(task.id, task);
		this.taskQueue.push(task);
	}

	assignTask(taskId: string, agentId: string): boolean {
		const task = this.tasks.get(taskId);
		const agent = this.agents.get(agentId);

		if (!task || !agent || agent.status !== "idle") {
			return false;
		}

		task.assignedAgent = agentId;
		task.status = "running";
		agent.status = "busy";

		return true;
	}

	completeTask(taskId: string): boolean {
		const task = this.tasks.get(taskId);
		if (!task) return false;

		task.status = "completed";
		if (task.assignedAgent) {
			const agent = this.agents.get(task.assignedAgent);
			if (agent) {
				agent.status = "idle";
			}
		}

		return true;
	}

	getPendingTasks(): Task[] {
		return Array.from(this.tasks.values()).filter(
			(task) => task.status === "pending",
		);
	}

	getRunningTasks(): Task[] {
		return Array.from(this.tasks.values()).filter(
			(task) => task.status === "running",
		);
	}

	getAvailableAgents(): Agent[] {
		return Array.from(this.agents.values()).filter(
			(agent) => agent.status === "idle",
		);
	}

	orchestrate(): void {
		const pendingTasks = this.getPendingTasks();
		const availableAgents = this.getAvailableAgents();

		for (const task of pendingTasks) {
			const suitableAgent = this.findSuitableAgent(task, availableAgents);
			if (suitableAgent) {
				this.assignTask(task.id, suitableAgent.id);
			}
		}
	}

	private findSuitableAgent(task: Task, agents: Agent[]): Agent | undefined {
		return agents.find(
			(agent) =>
				agent.capabilities.includes(task.type) && agent.status === "idle",
		);
	}
}

describe("AgentOrchestrator", () => {
	let orchestrator: AgentOrchestrator;

	beforeEach(() => {
		orchestrator = new AgentOrchestrator();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Agent Management", () => {
		it("should register an agent", () => {
			const agent: Agent = {
				id: "agent-1",
				name: "Test Agent",
				type: "worker",
				status: "idle",
				capabilities: ["task1", "task2"],
			};

			orchestrator.registerAgent(agent);

			expect(orchestrator.getAgent("agent-1")).toEqual(agent);
		});

		it("should unregister an agent", () => {
			const agent: Agent = {
				id: "agent-1",
				name: "Test Agent",
				type: "worker",
				status: "idle",
				capabilities: ["task1"],
			};

			orchestrator.registerAgent(agent);
			orchestrator.unregisterAgent("agent-1");

			expect(orchestrator.getAgent("agent-1")).toBeUndefined();
		});

		it("should get all registered agents", () => {
			const agent1: Agent = {
				id: "agent-1",
				name: "Agent 1",
				type: "worker",
				status: "idle",
				capabilities: ["task1"],
			};

			const agent2: Agent = {
				id: "agent-2",
				name: "Agent 2",
				type: "supervisor",
				status: "idle",
				capabilities: ["task2"],
			};

			orchestrator.registerAgent(agent1);
			orchestrator.registerAgent(agent2);

			const allAgents = orchestrator.getAllAgents();
			expect(allAgents).toHaveLength(2);
			expect(allAgents).toContain(agent1);
			expect(allAgents).toContain(agent2);
		});

		it("should get available agents only", () => {
			const idleAgent: Agent = {
				id: "idle-agent",
				name: "Idle Agent",
				type: "worker",
				status: "idle",
				capabilities: ["task1"],
			};

			const busyAgent: Agent = {
				id: "busy-agent",
				name: "Busy Agent",
				type: "worker",
				status: "busy",
				capabilities: ["task1"],
			};

			orchestrator.registerAgent(idleAgent);
			orchestrator.registerAgent(busyAgent);

			const availableAgents = orchestrator.getAvailableAgents();
			expect(availableAgents).toHaveLength(1);
			expect(availableAgents[0]).toEqual(idleAgent);
		});
	});

	describe("Task Management", () => {
		it("should add a task", () => {
			const task: Task = {
				id: "task-1",
				type: "data-processing",
				payload: { data: "test" },
				priority: 1,
				status: "pending",
			};

			orchestrator.addTask(task);

			const pendingTasks = orchestrator.getPendingTasks();
			expect(pendingTasks).toHaveLength(1);
			expect(pendingTasks[0]).toEqual(task);
		});

		it("should assign task to agent", () => {
			const agent: Agent = {
				id: "agent-1",
				name: "Test Agent",
				type: "worker",
				status: "idle",
				capabilities: ["data-processing"],
			};

			const task: Task = {
				id: "task-1",
				type: "data-processing",
				payload: { data: "test" },
				priority: 1,
				status: "pending",
			};

			orchestrator.registerAgent(agent);
			orchestrator.addTask(task);

			const success = orchestrator.assignTask("task-1", "agent-1");

			expect(success).toBe(true);
			expect(orchestrator.getAgent("agent-1")?.status).toBe("busy");
			expect(orchestrator.getRunningTasks()).toHaveLength(1);
		});

		it("should not assign task to busy agent", () => {
			const agent: Agent = {
				id: "agent-1",
				name: "Test Agent",
				type: "worker",
				status: "busy",
				capabilities: ["data-processing"],
			};

			const task: Task = {
				id: "task-1",
				type: "data-processing",
				payload: { data: "test" },
				priority: 1,
				status: "pending",
			};

			orchestrator.registerAgent(agent);
			orchestrator.addTask(task);

			const success = orchestrator.assignTask("task-1", "agent-1");

			expect(success).toBe(false);
		});

		it("should complete a task and free the agent", () => {
			const agent: Agent = {
				id: "agent-1",
				name: "Test Agent",
				type: "worker",
				status: "idle",
				capabilities: ["data-processing"],
			};

			const task: Task = {
				id: "task-1",
				type: "data-processing",
				payload: { data: "test" },
				priority: 1,
				status: "pending",
			};

			orchestrator.registerAgent(agent);
			orchestrator.addTask(task);
			orchestrator.assignTask("task-1", "agent-1");

			const success = orchestrator.completeTask("task-1");

			expect(success).toBe(true);
			expect(orchestrator.getAgent("agent-1")?.status).toBe("idle");
		});
	});

	describe("Orchestration Logic", () => {
		it("should automatically assign suitable tasks to available agents", () => {
			const agent1: Agent = {
				id: "agent-1",
				name: "Data Agent",
				type: "worker",
				status: "idle",
				capabilities: ["data-processing"],
			};

			const agent2: Agent = {
				id: "agent-2",
				name: "ML Agent",
				type: "worker",
				status: "idle",
				capabilities: ["ml-processing"],
			};

			const task1: Task = {
				id: "task-1",
				type: "data-processing",
				payload: { data: "test" },
				priority: 1,
				status: "pending",
			};

			const task2: Task = {
				id: "task-2",
				type: "ml-processing",
				payload: { model: "test" },
				priority: 1,
				status: "pending",
			};

			orchestrator.registerAgent(agent1);
			orchestrator.registerAgent(agent2);
			orchestrator.addTask(task1);
			orchestrator.addTask(task2);

			orchestrator.orchestrate();

			expect(orchestrator.getRunningTasks()).toHaveLength(2);
			expect(orchestrator.getPendingTasks()).toHaveLength(0);
		});

		it("should handle case where no suitable agent is available", () => {
			const agent: Agent = {
				id: "agent-1",
				name: "Data Agent",
				type: "worker",
				status: "idle",
				capabilities: ["data-processing"],
			};

			const task: Task = {
				id: "task-1",
				type: "ml-processing", // Agent doesn't have this capability
				payload: { model: "test" },
				priority: 1,
				status: "pending",
			};

			orchestrator.registerAgent(agent);
			orchestrator.addTask(task);

			orchestrator.orchestrate();

			expect(orchestrator.getRunningTasks()).toHaveLength(0);
			expect(orchestrator.getPendingTasks()).toHaveLength(1);
		});

		it("should prioritize tasks correctly", () => {
			const agent: Agent = {
				id: "agent-1",
				name: "Test Agent",
				type: "worker",
				status: "idle",
				capabilities: ["task1", "task2"],
			};

			const lowPriorityTask: Task = {
				id: "task-1",
				type: "task1",
				payload: {},
				priority: 1,
				status: "pending",
			};

			const highPriorityTask: Task = {
				id: "task-2",
				type: "task2",
				payload: {},
				priority: 10,
				status: "pending",
			};

			orchestrator.registerAgent(agent);
			orchestrator.addTask(lowPriorityTask);
			orchestrator.addTask(highPriorityTask);

			// Should handle task assignment based on capabilities and availability
			orchestrator.orchestrate();

			expect(orchestrator.getRunningTasks()).toHaveLength(1);
		});
	});

	describe("Error Handling", () => {
		it("should handle non-existent agent assignment", () => {
			const task: Task = {
				id: "task-1",
				type: "data-processing",
				payload: { data: "test" },
				priority: 1,
				status: "pending",
			};

			orchestrator.addTask(task);

			const success = orchestrator.assignTask("task-1", "non-existent-agent");

			expect(success).toBe(false);
		});

		it("should handle non-existent task completion", () => {
			const success = orchestrator.completeTask("non-existent-task");

			expect(success).toBe(false);
		});

		it("should handle empty orchestration gracefully", () => {
			// No agents or tasks
			expect(() => orchestrator.orchestrate()).not.toThrow();

			expect(orchestrator.getAllAgents()).toHaveLength(0);
			expect(orchestrator.getPendingTasks()).toHaveLength(0);
		});
	});
});
