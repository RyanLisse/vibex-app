/**
 * Orchestrator Agent
 *
 * Manages and coordinates multiple agents, handles task delegation,
 * and ensures proper workflow execution across the multi-agent system.
 */

import { logger } from "@/lib/logging";
import { observability } from "@/lib/observability";
import type { Agent, CreateAgentRequest, LettaClient, Message } from "../client";

export interface TaskDefinition {
	id: string;
	name: string;
	description: string;
	priority: "low" | "medium" | "high" | "critical";
	dependencies: string[];
	assignedAgent?: string;
	status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
	metadata: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

export interface AgentCapability {
	name: string;
	description: string;
	tools: string[];
	expertise: string[];
	maxConcurrentTasks: number;
}

export interface OrchestratorConfig {
	maxConcurrentTasks: number;
	taskTimeout: number;
	retryAttempts: number;
	healthCheckInterval: number;
}

export interface WorkflowResult {
	success: boolean;
	completedTasks: TaskDefinition[];
	failedTasks: TaskDefinition[];
	totalDuration: number;
	errors: Error[];
}

export class OrchestratorAgent {
	private client: LettaClient;
	private agentId: string | null = null;
	private managedAgents = new Map<string, Agent>();
	private agentCapabilities = new Map<string, AgentCapability>();
	private activeTasks = new Map<string, TaskDefinition>();
	private taskQueue: TaskDefinition[] = [];
	private config: OrchestratorConfig;
	private logger = logger.child({ component: "OrchestratorAgent" });
	private isRunning = false;
	private healthCheckTimer: NodeJS.Timeout | null = null;

	constructor(client: LettaClient, config: Partial<OrchestratorConfig> = {}) {
		this.client = client;
		this.config = {
			maxConcurrentTasks: 10,
			taskTimeout: 300000, // 5 minutes
			retryAttempts: 3,
			healthCheckInterval: 60000, // 1 minute
			...config,
		};
	}

	/**
	 * Initialize the orchestrator agent
	 */
	async initialize(): Promise<void> {
		try {
			this.logger.info("Initializing orchestrator agent");

			// Create the orchestrator agent in Letta
			const agentRequest: CreateAgentRequest = {
				name: "Orchestrator",
				description:
					"Multi-agent system orchestrator responsible for task delegation and workflow management",
				persona:
					"You are an intelligent orchestrator that manages multiple AI agents. You excel at breaking down complex tasks, delegating work efficiently, and coordinating between different agents to achieve optimal results.",
				system:
					"You are the orchestrator of a multi-agent system. Your role is to:\n1. Analyze incoming tasks and break them down into manageable subtasks\n2. Assign tasks to the most appropriate agents based on their capabilities\n3. Monitor task progress and handle failures\n4. Coordinate communication between agents\n5. Ensure workflow completion and quality",
				tools: ["task_manager", "agent_coordinator", "workflow_monitor"],
				metadata: {
					type: "orchestrator",
					version: "1.0.0",
					capabilities: ["task_delegation", "workflow_management", "agent_coordination"],
				},
			};

			const agent = await this.client.createAgent(agentRequest);
			this.agentId = agent.id;

			// Start health monitoring
			this.startHealthMonitoring();

			this.logger.info("Orchestrator agent initialized", { agentId: this.agentId });
			observability.recordEvent("orchestrator.initialized", { agentId: this.agentId });
		} catch (error) {
			this.logger.error("Failed to initialize orchestrator agent", { error });
			observability.recordError("orchestrator.init_failed", error as Error);
			throw error;
		}
	}

	/**
	 * Register a managed agent with its capabilities
	 */
	async registerAgent(agent: Agent, capabilities: AgentCapability): Promise<void> {
		try {
			this.managedAgents.set(agent.id, agent);
			this.agentCapabilities.set(agent.id, capabilities);

			this.logger.info("Agent registered", {
				agentId: agent.id,
				agentName: agent.name,
				capabilities: capabilities.name,
			});

			observability.recordEvent("orchestrator.agent_registered", {
				agentId: agent.id,
				agentName: agent.name,
				capabilities: capabilities.expertise,
			});
		} catch (error) {
			this.logger.error("Failed to register agent", { agentId: agent.id, error });
			throw error;
		}
	}

	/**
	 * Unregister a managed agent
	 */
	async unregisterAgent(agentId: string): Promise<void> {
		try {
			// Cancel any active tasks assigned to this agent
			for (const [taskId, task] of this.activeTasks.entries()) {
				if (task.assignedAgent === agentId) {
					task.status = "cancelled";
					this.activeTasks.delete(taskId);
				}
			}

			this.managedAgents.delete(agentId);
			this.agentCapabilities.delete(agentId);

			this.logger.info("Agent unregistered", { agentId });
			observability.recordEvent("orchestrator.agent_unregistered", { agentId });
		} catch (error) {
			this.logger.error("Failed to unregister agent", { agentId, error });
			throw error;
		}
	}

	/**
	 * Add a task to the orchestrator queue
	 */
	async addTask(
		task: Omit<TaskDefinition, "id" | "status" | "createdAt" | "updatedAt">
	): Promise<string> {
		try {
			const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			const fullTask: TaskDefinition = {
				...task,
				id: taskId,
				status: "pending",
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			this.taskQueue.push(fullTask);

			this.logger.info("Task added to queue", { taskId, taskName: task.name });
			observability.recordEvent("orchestrator.task_added", { taskId, taskName: task.name });

			// Process queue if orchestrator is running
			if (this.isRunning) {
				this.processTaskQueue();
			}

			return taskId;
		} catch (error) {
			this.logger.error("Failed to add task", { error });
			throw error;
		}
	}

	/**
	 * Start the orchestrator workflow processing
	 */
	async start(): Promise<void> {
		if (this.isRunning) {
			this.logger.warn("Orchestrator is already running");
			return;
		}

		this.isRunning = true;
		this.logger.info("Orchestrator started");
		observability.recordEvent("orchestrator.started", {});

		// Start processing the task queue
		this.processTaskQueue();
	}

	/**
	 * Stop the orchestrator workflow processing
	 */
	async stop(): Promise<void> {
		this.isRunning = false;

		// Stop health monitoring
		if (this.healthCheckTimer) {
			clearInterval(this.healthCheckTimer);
			this.healthCheckTimer = null;
		}

		this.logger.info("Orchestrator stopped");
		observability.recordEvent("orchestrator.stopped", {});
	}

	/**
	 * Get task status
	 */
	getTaskStatus(taskId: string): TaskDefinition | null {
		return (
			this.activeTasks.get(taskId) || this.taskQueue.find((task) => task.id === taskId) || null
		);
	}

	/**
	 * Get all active tasks
	 */
	getActiveTasks(): TaskDefinition[] {
		return Array.from(this.activeTasks.values());
	}

	/**
	 * Get task queue
	 */
	getTaskQueue(): TaskDefinition[] {
		return [...this.taskQueue];
	}

	/**
	 * Get managed agents
	 */
	getManagedAgents(): Agent[] {
		return Array.from(this.managedAgents.values());
	}

	/**
	 * Execute a workflow with multiple tasks
	 */
	async executeWorkflow(
		tasks: Omit<TaskDefinition, "id" | "status" | "createdAt" | "updatedAt">[]
	): Promise<WorkflowResult> {
		const startTime = Date.now();
		const completedTasks: TaskDefinition[] = [];
		const failedTasks: TaskDefinition[] = [];
		const errors: Error[] = [];

		try {
			this.logger.info("Starting workflow execution", { taskCount: tasks.length });

			// Add all tasks to queue
			const taskIds = await Promise.all(tasks.map((task) => this.addTask(task)));

			// Start orchestrator if not running
			if (!this.isRunning) {
				await this.start();
			}

			// Wait for all tasks to complete
			await this.waitForTasks(taskIds);

			// Collect results
			for (const taskId of taskIds) {
				const task = this.getTaskStatus(taskId);
				if (task) {
					if (task.status === "completed") {
						completedTasks.push(task);
					} else if (task.status === "failed") {
						failedTasks.push(task);
					}
				}
			}

			const totalDuration = Date.now() - startTime;
			const success = failedTasks.length === 0;

			this.logger.info("Workflow execution completed", {
				success,
				completedCount: completedTasks.length,
				failedCount: failedTasks.length,
				duration: totalDuration,
			});

			return {
				success,
				completedTasks,
				failedTasks,
				totalDuration,
				errors,
			};
		} catch (error) {
			this.logger.error("Workflow execution failed", { error });
			errors.push(error as Error);

			return {
				success: false,
				completedTasks,
				failedTasks,
				totalDuration: Date.now() - startTime,
				errors,
			};
		}
	}

	/**
	 * Process the task queue
	 */
	private processTaskQueue(): void {
		if (!this.isRunning || this.activeTasks.size >= this.config.maxConcurrentTasks) {
			return;
		}

		// Sort tasks by priority and dependencies
		const availableTasks = this.taskQueue
			.filter((task) => task.status === "pending")
			.filter((task) => this.areDependenciesMet(task))
			.sort((a, b) => this.getPriorityScore(b) - this.getPriorityScore(a));

		const tasksToProcess = availableTasks.slice(
			0,
			this.config.maxConcurrentTasks - this.activeTasks.size
		);

		for (const task of tasksToProcess) {
			this.processTask(task);
		}
	}

	/**
	 * Process a single task
	 */
	private async processTask(task: TaskDefinition): Promise<void> {
		try {
			// Find best agent for this task
			const assignedAgent = this.findBestAgent(task);
			if (!assignedAgent) {
				this.logger.warn("No suitable agent found for task", { taskId: task.id });
				task.status = "failed";
				return;
			}

			// Move task from queue to active
			const queueIndex = this.taskQueue.findIndex((t) => t.id === task.id);
			if (queueIndex !== -1) {
				this.taskQueue.splice(queueIndex, 1);
			}

			task.assignedAgent = assignedAgent.id;
			task.status = "in_progress";
			task.updatedAt = new Date();
			this.activeTasks.set(task.id, task);

			this.logger.info("Task assigned to agent", {
				taskId: task.id,
				agentId: assignedAgent.id,
				agentName: assignedAgent.name,
			});

			// Execute task with timeout
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error("Task timeout")), this.config.taskTimeout);
			});

			const taskPromise = this.executeTaskWithAgent(task, assignedAgent);

			await Promise.race([taskPromise, timeoutPromise]);

			task.status = "completed";
			task.updatedAt = new Date();

			this.logger.info("Task completed", { taskId: task.id });
			observability.recordEvent("orchestrator.task_completed", { taskId: task.id });
		} catch (error) {
			this.logger.error("Task failed", { taskId: task.id, error });
			task.status = "failed";
			task.updatedAt = new Date();
			observability.recordError("orchestrator.task_failed", error as Error);
		} finally {
			// Continue processing queue
			setTimeout(() => this.processTaskQueue(), 100);
		}
	}

	/**
	 * Execute task with assigned agent
	 */
	private async executeTaskWithAgent(task: TaskDefinition, agent: Agent): Promise<void> {
		if (!this.agentId) {
			throw new Error("Orchestrator not initialized");
		}

		// Send task to agent
		const message = `Execute the following task:
Task ID: ${task.id}
Name: ${task.name}
Description: ${task.description}
Priority: ${task.priority}
Metadata: ${JSON.stringify(task.metadata, null, 2)}

Please complete this task and provide a detailed response about the results.`;

		const response = await this.client.sendMessage({
			agent_id: agent.id,
			message,
			role: "user",
		});

		// Process agent response
		if (response.messages.length === 0) {
			throw new Error("No response from agent");
		}

		// Update task with results
		task.metadata.agentResponse = response.messages;
		task.metadata.completedAt = new Date().toISOString();
	}

	/**
	 * Find the best agent for a task
	 */
	private findBestAgent(task: TaskDefinition): Agent | null {
		let bestAgent: Agent | null = null;
		let bestScore = 0;

		for (const [agentId, agent] of this.managedAgents.entries()) {
			const capabilities = this.agentCapabilities.get(agentId);
			if (!capabilities) continue;

			// Check if agent is available
			const currentTasks = Array.from(this.activeTasks.values()).filter(
				(t) => t.assignedAgent === agentId
			).length;

			if (currentTasks >= capabilities.maxConcurrentTasks) {
				continue;
			}

			// Calculate compatibility score
			const score = this.calculateAgentScore(task, capabilities);
			if (score > bestScore) {
				bestScore = score;
				bestAgent = agent;
			}
		}

		return bestAgent;
	}

	/**
	 * Calculate agent compatibility score for a task
	 */
	private calculateAgentScore(task: TaskDefinition, capabilities: AgentCapability): number {
		let score = 0;

		// Check expertise match
		const taskKeywords = (task.name + " " + task.description).toLowerCase();
		for (const expertise of capabilities.expertise) {
			if (taskKeywords.includes(expertise.toLowerCase())) {
				score += 10;
			}
		}

		// Check tool availability
		const requiredTools = (task.metadata.requiredTools as string[]) || [];
		for (const tool of requiredTools) {
			if (capabilities.tools.includes(tool)) {
				score += 5;
			}
		}

		// Priority bonus
		const priorityBonus = {
			low: 1,
			medium: 2,
			high: 3,
			critical: 5,
		};
		score += priorityBonus[task.priority];

		return score;
	}

	/**
	 * Check if task dependencies are met
	 */
	private areDependenciesMet(task: TaskDefinition): boolean {
		for (const depId of task.dependencies) {
			const depTask = this.activeTasks.get(depId) || this.taskQueue.find((t) => t.id === depId);

			if (!depTask || depTask.status !== "completed") {
				return false;
			}
		}
		return true;
	}

	/**
	 * Get priority score for sorting
	 */
	private getPriorityScore(task: TaskDefinition): number {
		const scores = {
			low: 1,
			medium: 2,
			high: 3,
			critical: 4,
		};
		return scores[task.priority];
	}

	/**
	 * Wait for specific tasks to complete
	 */
	private async waitForTasks(taskIds: string[]): Promise<void> {
		const checkInterval = 1000; // 1 second
		const maxWaitTime = 300000; // 5 minutes
		const startTime = Date.now();

		while (Date.now() - startTime < maxWaitTime) {
			const pendingTasks = taskIds.filter((taskId) => {
				const task = this.getTaskStatus(taskId);
				return task && task.status !== "completed" && task.status !== "failed";
			});

			if (pendingTasks.length === 0) {
				return;
			}

			await new Promise((resolve) => setTimeout(resolve, checkInterval));
		}

		throw new Error("Tasks did not complete within timeout");
	}

	/**
	 * Start health monitoring for managed agents
	 */
	private startHealthMonitoring(): void {
		this.healthCheckTimer = setInterval(async () => {
			for (const [agentId, agent] of this.managedAgents.entries()) {
				try {
					const isHealthy = await this.client.healthCheck();
					if (!isHealthy) {
						this.logger.warn("Agent health check failed", { agentId, agentName: agent.name });
						observability.recordEvent("orchestrator.agent_unhealthy", { agentId });
					}
				} catch (error) {
					this.logger.error("Health check error", { agentId, error });
				}
			}
		}, this.config.healthCheckInterval);
	}
}

// Factory function
export function createOrchestratorAgent(
	client: LettaClient,
	config?: Partial<OrchestratorConfig>
): OrchestratorAgent {
	return new OrchestratorAgent(client, config);
}

export default OrchestratorAgent;
