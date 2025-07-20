import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useWebSocket } from "./use-websocket";

export interface AmbientAgentData {
	agents: Agent[];
	tasks: Task[];
	events: Event[];
	memory: MemoryNamespace[];
	communications: Communication[];
	dependencies: Dependency[];
}

export interface Agent {
	id: string;
	name: string;
	type: "coder" | "reviewer" | "tester" | "researcher" | "optimizer";
	provider: "claude" | "openai" | "gemini" | "custom";
	status: "idle" | "busy" | "error" | "terminated";
	capabilities: string[];
	metrics: {
		totalTasks: number;
		completedTasks: number;
		failedTasks: number;
		averageResponseTime: number;
		cpuUsage: number;
		memoryUsage: number;
	};
	currentTask?: {
		id: string;
		name: string;
		progress: number;
		estimatedCompletion: Date;
	};
}

export interface Task {
	id: string;
	name: string;
	status: "pending" | "running" | "completed" | "failed";
	dependencies: string[];
	assignedAgent?: string;
	progress: number;
	startTime?: Date;
	endTime?: Date;
}

export interface Event {
	id: string;
	type:
		| "agent.created"
		| "agent.status.changed"
		| "task.started"
		| "task.completed"
		| "memory.updated";
	timestamp: Date;
	source: string;
	target?: string;
	data: any;
}

export interface Communication {
	from: string;
	to: string;
	type: "data" | "command" | "event" | "memory";
	throughput: number;
	latency: number;
	isActive: boolean;
}

export interface Dependency {
	from: string;
	to: string;
	type: "task" | "data" | "resource";
	status: "active" | "completed" | "failed";
}

export interface MemoryNamespace {
	id: string;
	name: string;
	usage: {
		used: number;
		total: number;
		percentage: number;
	};
	connections: string[];
}

export const useAmbientAgentData = (swarmId?: string) => {
	const queryClient = useQueryClient();
	const [eventStream, setEventStream] = useState<Event[]>([]);

	// Fetch initial data
	const {
		data: agentData,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["ambient-agent-data", swarmId],
		queryFn: async (): Promise<AmbientAgentData> => {
			const response = await fetch(
				`/api/ambient-agents${swarmId ? `?swarmId=${swarmId}` : ""}`,
			);
			if (!response.ok) {
				throw new Error("Failed to fetch ambient agent data");
			}
			return response.json();
		},
		refetchInterval: 5000, // Refetch every 5 seconds
		staleTime: 2000, // Consider data stale after 2 seconds
	});

	// WebSocket connection for real-time updates
	const { lastMessage, connectionStatus } = useWebSocket(
		`/api/ambient-agents/ws${swarmId ? `?swarmId=${swarmId}` : ""}`,
		{
			onOpen: () => console.log("Ambient agent WebSocket connected"),
			onClose: () => console.log("Ambient agent WebSocket disconnected"),
			onError: (error) =>
				console.error("Ambient agent WebSocket error:", error),
		},
	);

	// Handle real-time updates
	useEffect(() => {
		if (lastMessage) {
			try {
				const update = JSON.parse(lastMessage.data);

				switch (update.type) {
					case "agent.status.changed":
						queryClient.setQueryData(
							["ambient-agent-data", swarmId],
							(old: AmbientAgentData | undefined) => {
								if (!old) return old;

								return {
									...old,
									agents: old.agents.map((agent) =>
										agent.id === update.agentId
											? {
													...agent,
													status: update.status,
													metrics: update.metrics,
												}
											: agent,
									),
								};
							},
						);
						break;

					case "task.progress.updated":
						queryClient.setQueryData(
							["ambient-agent-data", swarmId],
							(old: AmbientAgentData | undefined) => {
								if (!old) return old;

								return {
									...old,
									tasks: old.tasks.map((task) =>
										task.id === update.taskId
											? {
													...task,
													progress: update.progress,
													status: update.status,
												}
											: task,
									),
								};
							},
						);
						break;

					case "communication.updated":
						queryClient.setQueryData(
							["ambient-agent-data", swarmId],
							(old: AmbientAgentData | undefined) => {
								if (!old) return old;

								return {
									...old,
									communications: old.communications.map((comm) =>
										comm.from === update.from && comm.to === update.to
											? {
													...comm,
													throughput: update.throughput,
													latency: update.latency,
													isActive: update.isActive,
												}
											: comm,
									),
								};
							},
						);
						break;

					case "event":
						setEventStream((prev) => [update.event, ...prev.slice(0, 99)]); // Keep last 100 events
						break;
				}
			} catch (error) {
				console.error("Error parsing WebSocket message:", error);
			}
		}
	}, [lastMessage, queryClient, swarmId]);

	const refreshData = useCallback(() => {
		refetch();
	}, [refetch]);

	return {
		agentData: agentData?.agents,
		taskData: agentData?.tasks
			? { tasks: agentData.tasks, dependencies: agentData.dependencies }
			: undefined,
		eventStream,
		memoryData: agentData?.memory
			? { namespaces: agentData.memory }
			: undefined,
		communications: agentData?.communications,
		isLoading,
		error,
		connectionStatus,
		refreshData,
	};
};
