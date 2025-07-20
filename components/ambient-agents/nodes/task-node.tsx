import { Handle, type NodeProps, Position } from "@xyflow/react";
import {
	AlertTriangle,
	CheckCircle,
	Clock,
	GitBranch,
	Pause,
	Play,
	User,
	XCircle,
} from "lucide-react";
import React, { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export interface TaskNodeData {
	task: {
		id: string;
		name: string;
		status: "pending" | "running" | "completed" | "failed";
		dependencies: string[];
		assignedAgent?: string;
		progress: number;
		startTime?: Date;
		endTime?: Date;
		priority: "low" | "medium" | "high" | "critical";
		estimatedDuration?: number;
	};
	metrics?: {
		executionTime?: number;
		retryCount?: number;
		resourceUsage?: number;
	};
}

export const TaskNode = memo<NodeProps<TaskNodeData>>(({ data, selected }) => {
	const { task, metrics } = data;

	const getStatusIcon = useCallback(() => {
		switch (task.status) {
			case "pending":
				return <Pause className="h-4 w-4 text-yellow-500" />;
			case "running":
				return <Play className="h-4 w-4 text-blue-500" />;
			case "completed":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case "failed":
				return <XCircle className="h-4 w-4 text-red-500" />;
			default:
				return <Clock className="h-4 w-4 text-gray-500" />;
		}
	}, [task.status]);

	const getStatusColor = useCallback(() => {
		switch (task.status) {
			case "pending":
				return "border-yellow-500 bg-yellow-50";
			case "running":
				return "border-blue-500 bg-blue-50";
			case "completed":
				return "border-green-500 bg-green-50";
			case "failed":
				return "border-red-500 bg-red-50";
			default:
				return "border-gray-500 bg-gray-50";
		}
	}, [task.status]);

	const getPriorityColor = useCallback(() => {
		switch (task.priority) {
			case "critical":
				return "bg-red-100 text-red-800";
			case "high":
				return "bg-orange-100 text-orange-800";
			case "medium":
				return "bg-yellow-100 text-yellow-800";
			case "low":
				return "bg-green-100 text-green-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	}, [task.priority]);

	const formatDuration = useCallback((ms?: number) => {
		if (!ms) return "N/A";
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
		return `${(ms / 60_000).toFixed(1)}m`;
	}, []);

	const getExecutionTime = useCallback(() => {
		if (metrics?.executionTime) return metrics.executionTime;
		if (task.startTime && task.endTime) {
			return (
				new Date(task.endTime).getTime() - new Date(task.startTime).getTime()
			);
		}
		if (task.startTime && task.status === "running") {
			return Date.now() - new Date(task.startTime).getTime();
		}
		return;
	}, [task, metrics]);

	return (
		<Card
			className={`w-72 cursor-pointer transition-all duration-200 ${getStatusColor()} ${selected ? "shadow-lg ring-2 ring-blue-500" : "shadow-md hover:shadow-lg"} `}
		>
			{/* Input/Output handles for connections */}
			<Handle
				className="h-3 w-3 bg-blue-500"
				position={Position.Top}
				type="target"
			/>
			<Handle
				className="h-3 w-3 bg-blue-500"
				position={Position.Bottom}
				type="source"
			/>

			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						{getStatusIcon()}
						<h3 className="truncate font-semibold text-sm">{task.name}</h3>
					</div>
					<Badge className={getPriorityColor()} variant="secondary">
						{task.priority}
					</Badge>
				</div>

				<div className="flex items-center space-x-2">
					<Badge className="text-xs" variant="outline">
						{task.status}
					</Badge>
					{task.dependencies.length > 0 && (
						<Badge
							className="flex items-center space-x-1 text-xs"
							variant="outline"
						>
							<GitBranch className="h-3 w-3" />
							<span>{task.dependencies.length} deps</span>
						</Badge>
					)}
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				{/* Progress bar for running tasks */}
				{(task.status === "running" || task.status === "completed") && (
					<div className="space-y-2">
						<div className="flex items-center justify-between text-xs">
							<span className="font-medium">Progress</span>
							<span className="text-gray-500">{task.progress}%</span>
						</div>
						<Progress className="h-2" value={task.progress} />
					</div>
				)}

				{/* Task details */}
				<div className="grid grid-cols-2 gap-2 text-xs">
					{task.assignedAgent && (
						<div className="col-span-2 flex items-center space-x-1">
							<User className="h-3 w-3 text-blue-500" />
							<span className="truncate">Agent: {task.assignedAgent}</span>
						</div>
					)}

					<div className="flex items-center space-x-1">
						<Clock className="h-3 w-3 text-purple-500" />
						<span>{formatDuration(getExecutionTime())}</span>
					</div>

					{task.estimatedDuration && (
						<div className="flex items-center space-x-1">
							<Clock className="h-3 w-3 text-gray-500" />
							<span>Est: {formatDuration(task.estimatedDuration)}</span>
						</div>
					)}

					{metrics?.retryCount && metrics.retryCount > 0 && (
						<div className="flex items-center space-x-1">
							<AlertTriangle className="h-3 w-3 text-yellow-500" />
							<span>{metrics.retryCount} retries</span>
						</div>
					)}

					{metrics?.resourceUsage && (
						<div className="flex items-center space-x-1">
							<GitBranch className="h-3 w-3 text-indigo-500" />
							<span>{metrics.resourceUsage}% resources</span>
						</div>
					)}
				</div>

				{/* Timestamps */}
				<div className="text-gray-600 text-xs">
					{task.startTime && (
						<div>Started: {new Date(task.startTime).toLocaleTimeString()}</div>
					)}
					{task.endTime && (
						<div>Ended: {new Date(task.endTime).toLocaleTimeString()}</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
});

TaskNode.displayName = "TaskNode";
