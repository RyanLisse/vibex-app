/**
 * Workflow Visualization Helpers
 *
 * Utilities for visualizing workflow definitions and executions
 */
import type { WorkflowStatus } from "./types";

// Visualization types
export interface WorkflowGraph {
	nodes: GraphNode[];
	edges: GraphEdge[];
	metadata: GraphMetadata;
}

export interface GraphNode {
	id: string;
	type: "start" | "end" | "step" | "decision" | "parallel" | "loop";
	label: string;
	description?: string;
	status?: StepStatus;
	metadata?: Record<string, any>;
	position?: { x: number; y: number };
	style?: NodeStyle;
}

export interface GraphEdge {
	id: string;
	source: string;
	target: string;
	label?: string;
	type?: "normal" | "conditional" | "loop" | "error";
	animated?: boolean;
	style?: EdgeStyle;
}

export interface GraphMetadata {
	workflowId: string;
	workflowName: string;
	version?: number;
	executionId?: string;
	status?: WorkflowStatus;
	progress?: number;
	timestamp?: Date;
}

export interface NodeStyle {
	backgroundColor?: string;
	borderColor?: string;
	borderWidth?: number;
	textColor?: string;
	icon?: string;
	shape?: "rectangle" | "circle" | "diamond" | "hexagon";
}

export interface EdgeStyle {
	strokeColor?: string;
	strokeWidth?: number;
	strokeDasharray?: string;
	arrowSize?: number;
}

// Color schemes
const STATUS_COLORS = {
	pending: "#94a3b8",
	running: "#3b82f6",
	completed: "#22c55e",
	failed: "#ef4444",
	skipped: "#6b7280",
	paused: "#f59e0b",
	cancelled: "#8b5cf6",
	retrying: "#06b6d4",
};

const STEP_TYPE_SHAPES = {
	action: "rectangle",
	condition: "diamond",
	parallel: "hexagon",
	sequential: "rectangle",
	loop: "circle",
	wait: "circle",
	human_approval: "rectangle",
	webhook: "rectangle",
	transform: "rectangle",
	aggregate: "hexagon",
	branch: "diamond",
} as const;

// Workflow visualizer
export class WorkflowVisualizer {
	/**
	 * Convert workflow definition to graph
	 */
	static toGraph(
		definition: WorkflowDefinition,
		execution?: WorkflowExecutionState,
	): WorkflowGraph {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const nodeMap = new Map<string, GraphNode>();

		// Add start node
		const startNode: GraphNode = {
			id: "start",
			type: "start",
			label: "Start",
			status: execution ? "completed" : undefined,
			style: {
				backgroundColor: "#10b981",
				shape: "circle",
			},
		};
		nodes.push(startNode);
		nodeMap.set("start", startNode);

		// Add step nodes
		definition.steps.forEach((step, index) => {
			const stepStatus = execution?.stepStates[step.id]?.status;
			const node: GraphNode = {
				id: step.id,
				type: WorkflowVisualizer.getNodeType(step.type),
				label: step.name,
				description: step.description,
				status: stepStatus,
				metadata: {
					stepType: step.type,
					timeout: step.timeout,
					retryPolicy: step.retryPolicy,
				},
				style: WorkflowVisualizer.getNodeStyle(step, stepStatus),
			};
			nodes.push(node);
			nodeMap.set(step.id, node);
		});

		// Add end node
		const endNode: GraphNode = {
			id: "end",
			type: "end",
			label: "End",
			status: execution?.status === "completed" ? "completed" : undefined,
			style: {
				backgroundColor: "#ef4444",
				shape: "circle",
			},
		};
		nodes.push(endNode);
		nodeMap.set("end", endNode);

		// Add edges based on step connections
		edges.push({
			id: "start-to-first",
			source: "start",
			target: definition.startStepId,
			animated: execution?.status === "running",
		});

		// Process each step to create edges
		definition.steps.forEach((step, index) => {
			const edgesFromStep = WorkflowVisualizer.createEdgesForStep(
				step,
				definition,
				execution,
			);
			edges.push(...edgesFromStep);
		});

		// Add edges to end node for terminal steps
		const terminalSteps = WorkflowVisualizer.findTerminalSteps(definition);
		terminalSteps.forEach((stepId) => {
			edges.push({
				id: `${stepId}-to-end`,
				source: stepId,
				target: "end",
			});
		});

		// Apply auto-layout
		WorkflowVisualizer.autoLayout(nodes, edges);

		return {
			nodes,
			edges,
			metadata: {
				workflowId: definition.id,
				workflowName: definition.name,
				version: definition.version,
				executionId: execution?.executionId,
				status: execution?.status,
				progress: execution
					? WorkflowVisualizer.calculateProgress(execution)
					: 0,
				timestamp: new Date(),
			},
		};
	}

	/**
	 * Get node type based on step type
	 */
	private static getNodeType(stepType: string): GraphNode["type"] {
		switch (stepType) {
			case "condition":
			case "branch":
				return "decision";
			case "parallel":
				return "parallel";
			case "loop":
				return "loop";
			default:
				return "step";
		}
	}

	/**
	 * Get node style based on step and status
	 */
	private static getNodeStyle(
		step: StepConfig,
		status?: StepStatus,
	): NodeStyle {
		const backgroundColor = status ? STATUS_COLORS[status] : "#e2e8f0";
		const shape = STEP_TYPE_SHAPES[step.type] || "rectangle";

		return {
			backgroundColor,
			borderColor: status === "running" ? "#3b82f6" : "#64748b",
			borderWidth: status === "running" ? 3 : 1,
			textColor:
				status === "completed" || status === "failed" ? "#ffffff" : "#1e293b",
			shape,
			icon: WorkflowVisualizer.getStepIcon(step.type),
		};
	}

	/**
	 * Get icon for step type
	 */
	private static getStepIcon(stepType: string): string {
		const icons: Record<string, string> = {
			action: "play",
			condition: "git-branch",
			parallel: "git-merge",
			sequential: "list",
			loop: "repeat",
			wait: "clock",
			human_approval: "user-check",
			webhook: "globe",
			transform: "code",
			aggregate: "layers",
			branch: "git-branch",
		};
		return icons[stepType] || "box";
	}

	/**
	 * Create edges for a specific step
	 */
	private static createEdgesForStep(
		step: StepConfig,
		definition: WorkflowDefinition,
		execution?: WorkflowExecutionState,
	): GraphEdge[] {
		const edges: GraphEdge[] = [];

		switch (step.type) {
			case "condition":
				edges.push({
					id: `${step.id}-true`,
					source: step.id,
					target: step.condition.trueStepId,
					label: "True",
					type: "conditional",
					style: { strokeColor: "#22c55e" },
				});

				if (step.condition.falseStepId) {
					edges.push({
						id: `${step.id}-false`,
						source: step.id,
						target: step.condition.falseStepId,
						label: "False",
						type: "conditional",
						style: { strokeColor: "#ef4444" },
					});
				}
				break;

			case "branch":
				step.branch.conditions.forEach((condition, index) => {
					edges.push({
						id: `${step.id}-branch-${index}`,
						source: step.id,
						target: condition.stepId,
						label: `Condition ${index + 1}`,
						type: "conditional",
					});
				});

				if (step.branch.defaultStepId) {
					edges.push({
						id: `${step.id}-default`,
						source: step.id,
						target: step.branch.defaultStepId,
						label: "Default",
						type: "conditional",
						style: { strokeDasharray: "5,5" },
					});
				}
				break;

			case "parallel":
				step.parallel.steps.forEach((targetId, index) => {
					edges.push({
						id: `${step.id}-parallel-${index}`,
						source: step.id,
						target: targetId,
						type: "normal",
					});
				});
				break;

			case "sequential":
				step.sequential.steps.forEach((targetId, index) => {
					if (index === 0) {
						edges.push({
							id: `${step.id}-to-${targetId}`,
							source: step.id,
							target: targetId,
							type: "normal",
						});
					}

					if (index < step.sequential.steps.length - 1) {
						const nextId = step.sequential.steps[index + 1];
						edges.push({
							id: `${targetId}-to-${nextId}`,
							source: targetId,
							target: nextId,
							type: "normal",
						});
					}
				});
				break;

			case "loop":
				edges.push({
					id: `${step.id}-to-body`,
					source: step.id,
					target: step.loop.bodyStepId,
					label: "Loop body",
					type: "loop",
				});

				edges.push({
					id: `${step.loop.bodyStepId}-to-${step.id}`,
					source: step.loop.bodyStepId,
					target: step.id,
					label: "Next iteration",
					type: "loop",
					style: { strokeDasharray: "3,3" },
				});
				break;

			default: {
				// For regular steps, find next step in sequence
				const currentIndex = definition.steps.findIndex(
					(s) => s.id === step.id,
				);
				if (currentIndex < definition.steps.length - 1) {
					const nextStep = definition.steps[currentIndex + 1];
					edges.push({
						id: `${step.id}-to-${nextStep.id}`,
						source: step.id,
						target: nextStep.id,
						type: "normal",
						animated: execution?.currentStepId === step.id,
					});
				}
			}
		}

		// Add error handling edges
		if (step.errorHandler?.fallbackStepId) {
			edges.push({
				id: `${step.id}-error-fallback`,
				source: step.id,
				target: step.errorHandler.fallbackStepId,
				label: "Error",
				type: "error",
				style: {
					strokeColor: "#ef4444",
					strokeDasharray: "5,5",
				},
			});
		}

		return edges;
	}

	/**
	 * Find terminal steps (steps with no outgoing edges)
	 */
	private static findTerminalSteps(definition: WorkflowDefinition): string[] {
		const hasOutgoingEdge = new Set<string>();

		definition.steps.forEach((step) => {
			switch (step.type) {
				case "condition":
					hasOutgoingEdge.add(step.id);
					break;
				case "branch":
					hasOutgoingEdge.add(step.id);
					break;
				case "parallel":
				case "sequential":
					hasOutgoingEdge.add(step.id);
					break;
				case "loop":
					hasOutgoingEdge.add(step.id);
					break;
				default: {
					const index = definition.steps.findIndex((s) => s.id === step.id);
					if (index < definition.steps.length - 1) {
						hasOutgoingEdge.add(step.id);
					}
				}
			}
		});

		return definition.steps
			.filter((step) => !hasOutgoingEdge.has(step.id))
			.map((step) => step.id);
	}

	/**
	 * Auto-layout nodes using a simple algorithm
	 */
	private static autoLayout(nodes: GraphNode[], edges: GraphEdge[]): void {
		const HORIZONTAL_SPACING = 200;
		const VERTICAL_SPACING = 100;

		// Build adjacency list
		const adjacency = new Map<string, string[]>();
		edges.forEach((edge) => {
			if (!adjacency.has(edge.source)) {
				adjacency.set(edge.source, []);
			}
			adjacency.get(edge.source)!.push(edge.target);
		});

		// Calculate levels using BFS
		const levels = new Map<string, number>();
		const queue: [string, number][] = [["start", 0]];
		const visited = new Set<string>();

		while (queue.length > 0) {
			const [nodeId, level] = queue.shift()!;

			if (visited.has(nodeId)) continue;
			visited.add(nodeId);
			levels.set(nodeId, level);

			const neighbors = adjacency.get(nodeId) || [];
			neighbors.forEach((neighbor) => {
				if (!visited.has(neighbor)) {
					queue.push([neighbor, level + 1]);
				}
			});
		}

		// Group nodes by level
		const nodesByLevel = new Map<number, string[]>();
		nodes.forEach((node) => {
			const level = levels.get(node.id) || 0;
			if (!nodesByLevel.has(level)) {
				nodesByLevel.set(level, []);
			}
			nodesByLevel.get(level)!.push(node.id);
		});

		// Position nodes
		nodes.forEach((node) => {
			const level = levels.get(node.id) || 0;
			const nodesInLevel = nodesByLevel.get(level) || [];
			const indexInLevel = nodesInLevel.indexOf(node.id);

			node.position = {
				x: level * HORIZONTAL_SPACING,
				y: (indexInLevel - (nodesInLevel.length - 1) / 2) * VERTICAL_SPACING,
			};
		});
	}

	/**
	 * Calculate workflow progress
	 */
	private static calculateProgress(execution: WorkflowExecutionState): number {
		const totalSteps = Object.keys(execution.stepStates).length;
		if (totalSteps === 0) return 0;

		const completedSteps = Object.values(execution.stepStates).filter(
			(state) => state.status === "completed" || state.status === "skipped",
		).length;

		return (completedSteps / totalSteps) * 100;
	}

	/**
	 * Generate execution timeline
	 */
	static generateTimeline(
		execution: WorkflowExecutionState,
	): ExecutionTimeline {
		const events: TimelineEvent[] = [];

		// Add workflow start event
		events.push({
			id: "workflow-start",
			type: "workflow",
			timestamp: execution.startedAt,
			title: "Workflow Started",
			description: `Triggered by ${execution.triggeredBy}`,
			status: "completed",
		});

		// Add step events
		Object.entries(execution.stepStates).forEach(([stepId, state]) => {
			if (state.startedAt) {
				events.push({
					id: `${stepId}-start`,
					type: "step",
					timestamp: state.startedAt,
					title: `Step Started: ${stepId}`,
					status: "completed",
				});
			}

			if (state.completedAt) {
				events.push({
					id: `${stepId}-end`,
					type: "step",
					timestamp: state.completedAt,
					title: `Step ${state.status}: ${stepId}`,
					description: state.error?.message,
					status: state.status,
					duration: state.startedAt
						? state.completedAt.getTime() - state.startedAt.getTime()
						: undefined,
				});
			}
		});

		// Add workflow end event
		if (execution.completedAt) {
			events.push({
				id: "workflow-end",
				type: "workflow",
				timestamp: execution.completedAt,
				title: `Workflow ${execution.status}`,
				description: execution.error?.message,
				status: execution.status as any,
				duration:
					execution.completedAt.getTime() - execution.startedAt.getTime(),
			});
		}

		// Sort events by timestamp
		events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		return {
			executionId: execution.executionId,
			events,
			totalDuration: execution.completedAt
				? execution.completedAt.getTime() - execution.startedAt.getTime()
				: Date.now() - execution.startedAt.getTime(),
			status: execution.status,
		};
	}
}

// Timeline types
export interface ExecutionTimeline {
	executionId: string;
	events: TimelineEvent[];
	totalDuration: number;
	status: WorkflowStatus;
}

export interface TimelineEvent {
	id: string;
	type: "workflow" | "step" | "error" | "pause" | "resume";
	timestamp: Date;
	title: string;
	description?: string;
	status: StepStatus | WorkflowStatus;
	duration?: number;
}

// Export utilities
export function getStatusColor(status?: StepStatus | WorkflowStatus): string {
	return status ? STATUS_COLORS[status] : "#e2e8f0";
}

export function getStatusIcon(status?: StepStatus | WorkflowStatus): string {
	const icons: Record<string, string> = {
		pending: "clock",
		running: "play",
		completed: "check-circle",
		failed: "x-circle",
		skipped: "skip-forward",
		paused: "pause",
		cancelled: "x",
		retrying: "refresh-cw",
	};
	return status ? icons[status] || "help-circle" : "circle";
}

export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
	if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
	return `${(ms / 3_600_000).toFixed(1)}h`;
}
