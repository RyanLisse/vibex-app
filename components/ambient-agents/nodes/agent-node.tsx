import { Handle, type NodeProps, Position } from "@xyflow/react";
	Activity,
	AlertTriangle,
	Brain,
	CheckCircle,
	Clock,
	Cpu,
	Pause,
	Play,
	Square,
} from "lucide-react";
import React, { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export interface AgentNodeData {
	agent: {
		id: string;
		name: string;
		type: "coder" | "reviewer" | "tester" | "researcher" | "optimizer";
		provider: "claude" | "openai" | "gemini" | "custom";
		status: "idle" | "busy" | "error" | "terminated";
		capabilities: string[];
	};
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

export const AgentNode = memo<NodeProps<AgentNodeData>>(
	({ data, selected }) => {
		const { agent, metrics, currentTask } = data;

		const getStatusIcon = useCallback(() => {
			switch (agent.status) {
				case "idle":
					return <Pause className="h-4 w-4 text-yellow-500" />;
				case "busy":
					return <Play className="h-4 w-4 text-green-500" />;
				case "error":
					return <AlertTriangle className="h-4 w-4 text-red-500" />;
				case "terminated":
					return <Square className="h-4 w-4 text-gray-500" />;
				default:
					return <Activity className="h-4 w-4 text-blue-500" />;
			}
		}, [agent.status]);

		const getStatusColor = useCallback(() => {
			switch (agent.status) {
				case "idle":
					return "border-yellow-500 bg-yellow-50";
				case "busy":
					return "border-green-500 bg-green-50";
				case "error":
					return "border-red-500 bg-red-50";
				case "terminated":
					return "border-gray-500 bg-gray-50";
				default:
					return "border-blue-500 bg-blue-50";
			}
		}, [agent.status]);

		const getProviderColor = useCallback(() => {
			switch (agent.provider) {
				case "claude":
					return "bg-orange-100 text-orange-800";
				case "openai":
					return "bg-green-100 text-green-800";
				case "gemini":
					return "bg-blue-100 text-blue-800";
				default:
					return "bg-gray-100 text-gray-800";
			}
		}, [agent.provider]);

		const successRate =
			metrics.totalTasks > 0
				? ((metrics.completedTasks / metrics.totalTasks) * 100).toFixed(1)
				: "0";

		return (
			<Card
				className={`w-80 cursor-pointer transition-all duration-200 ${getStatusColor()} ${selected ? "shadow-lg ring-2 ring-blue-500" : "shadow-md hover:shadow-lg"} `}
			>
				{/* Input/Output handles for connections */}
				<Handle
					className="h-3 w-3 bg-blue-500"
					position={Position.Left}
					type="target"
				/>
				<Handle
					className="h-3 w-3 bg-blue-500"
					position={Position.Right}
					type="source"
				/>

				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							{getStatusIcon()}
							<h3 className="font-semibold text-sm">{agent.name}</h3>
						</div>
						<Badge className={getProviderColor()} variant="secondary">
							{agent.provider}
						</Badge>
					</div>
					<div className="flex items-center space-x-2">
						<Badge className="text-xs" variant="outline">
							{agent.type}
						</Badge>
						<Badge className="text-xs" variant="outline">
							{agent.capabilities.length} capabilities
						</Badge>
					</div>
				</CardHeader>

				<CardContent className="space-y-3">
					{/* Current task progress */}
					{currentTask && agent.status === "busy" && (
						<div className="space-y-2">
							<div className="flex items-center justify-between text-xs">
								<span className="font-medium">Current Task</span>
								<span className="text-gray-500">{currentTask.progress}%</span>
							</div>
							<Progress className="h-2" value={currentTask.progress} />
							<div className="truncate text-gray-600 text-xs">
								{currentTask.name}
							</div>
						</div>
					)}

					{/* Performance metrics */}
					<div className="grid grid-cols-2 gap-2 text-xs">
						<div className="flex items-center space-x-1">
							<CheckCircle className="h-3 w-3 text-green-500" />
							<span>{successRate}% success</span>
						</div>
						<div className="flex items-center space-x-1">
							<Clock className="h-3 w-3 text-blue-500" />
							<span>{metrics.averageResponseTime}ms avg</span>
						</div>
						<div className="flex items-center space-x-1">
							<Cpu className="h-3 w-3 text-purple-500" />
							<span>{metrics.cpuUsage}% CPU</span>
						</div>
						<div className="flex items-center space-x-1">
							<Brain className="h-3 w-3 text-indigo-500" />
							<span>{metrics.memoryUsage}% memory</span>
						</div>
					</div>

					{/* Task statistics */}
					<div className="flex justify-between text-gray-600 text-xs">
						<span>{metrics.completedTasks} completed</span>
						<span>{metrics.failedTasks} failed</span>
						<span>{metrics.totalTasks} total</span>
					</div>
				</CardContent>
			</Card>
		);
	},
);

AgentNode.displayName = "AgentNode";
