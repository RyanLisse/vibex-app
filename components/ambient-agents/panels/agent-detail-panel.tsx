import type { Node } from "@xyflow/react";
import {
	Activity,
	AlertTriangle,
	Brain,
	CheckCircle,
	Clock,
	Cpu,
	Pause,
	Play,
	X,
} from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AgentNodeData } from "../nodes/agent-node";

export interface AgentDetailPanelProps {
	node: Node<AgentNodeData> | null;
	isOpen: boolean;
	onClose: () => void;
}

export const AgentDetailPanel: React.FC<AgentDetailPanelProps> = ({
	node,
	isOpen,
	onClose,
}) => {
	if (!(isOpen && node) || node.type !== "agent") {
		return null;
	}

	const { agent, metrics, currentTask } = node.data;

	const getStatusIcon = () => {
		switch (agent.status) {
			case "idle":
				return <Pause className="h-4 w-4 text-yellow-500" />;
			case "busy":
				return <Play className="h-4 w-4 text-green-500" />;
			case "error":
				return <AlertTriangle className="h-4 w-4 text-red-500" />;
			case "terminated":
				return <X className="h-4 w-4 text-gray-500" />;
			default:
				return <Activity className="h-4 w-4 text-blue-500" />;
		}
	};

	const getProviderColor = () => {
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
	};

	const successRate =
		metrics.totalTasks > 0
			? ((metrics.completedTasks / metrics.totalTasks) * 100).toFixed(1)
			: "0";

	const errorRate =
		metrics.totalTasks > 0
			? ((metrics.failedTasks / metrics.totalTasks) * 100).toFixed(1)
			: "0";

	return (
		<div className="fixed inset-y-0 right-0 z-50 flex w-96 flex-col border-l bg-white shadow-xl">
			{/* Header */}
			<div className="flex items-center justify-between border-b p-4">
				<div className="flex items-center space-x-2">
					{getStatusIcon()}
					<h2 className="font-semibold text-lg">{agent.name}</h2>
				</div>
				<Button onClick={onClose} size="sm" variant="ghost">
					<X className="h-4 w-4" />
				</Button>
			</div>

			<ScrollArea className="flex-1">
				<div className="space-y-4 p-4">
					{/* Basic Info */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Agent Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-gray-600 text-sm">Provider</span>
								<Badge className={getProviderColor()} variant="secondary">
									{agent.provider}
								</Badge>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-gray-600 text-sm">Type</span>
								<Badge variant="outline">{agent.type}</Badge>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-gray-600 text-sm">Status</span>
								<div className="flex items-center space-x-1">
									{getStatusIcon()}
									<span className="text-sm capitalize">{agent.status}</span>
								</div>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-gray-600 text-sm">Node ID</span>
								<span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">
									{agent.id}
								</span>
							</div>
						</CardContent>
					</Card>

					{/* Current Task */}
					{currentTask && agent.status === "busy" && (
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm">Current Task</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div>
									<div className="mb-2 flex items-center justify-between text-sm">
										<span className="font-medium">{currentTask.name}</span>
										<span className="text-gray-500">
											{currentTask.progress}%
										</span>
									</div>
									<Progress className="h-2" value={currentTask.progress} />
								</div>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-gray-600">Task ID</span>
										<span className="font-mono text-xs">{currentTask.id}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Est. Completion</span>
										<span>
											{new Date(
												currentTask.estimatedCompletion,
											).toLocaleTimeString()}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Capabilities */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Capabilities</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-1">
								{agent.capabilities.map((capability, index) => (
									<Badge className="text-xs" key={index} variant="outline">
										{capability}
									</Badge>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Metrics */}
					<Tabs className="w-full" defaultValue="performance">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="performance">Performance</TabsTrigger>
							<TabsTrigger value="tasks">Tasks</TabsTrigger>
						</TabsList>

						<TabsContent className="space-y-4" value="performance">
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-sm">Resource Usage</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="space-y-2">
										<div className="flex items-center justify-between text-sm">
											<div className="flex items-center space-x-1">
												<Cpu className="h-3 w-3 text-purple-500" />
												<span>CPU Usage</span>
											</div>
											<span>{metrics.cpuUsage}%</span>
										</div>
										<Progress className="h-2" value={metrics.cpuUsage} />
									</div>

									<div className="space-y-2">
										<div className="flex items-center justify-between text-sm">
											<div className="flex items-center space-x-1">
												<Brain className="h-3 w-3 text-indigo-500" />
												<span>Memory Usage</span>
											</div>
											<span>{metrics.memoryUsage}%</span>
										</div>
										<Progress className="h-2" value={metrics.memoryUsage} />
									</div>

									<div className="flex items-center justify-between text-sm">
										<div className="flex items-center space-x-1">
											<Clock className="h-3 w-3 text-blue-500" />
											<span>Avg Response Time</span>
										</div>
										<span>{metrics.averageResponseTime}ms</span>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-sm">Success Metrics</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="space-y-2">
										<div className="flex items-center justify-between text-sm">
											<span>Success Rate</span>
											<span className="font-medium text-green-600">
												{successRate}%
											</span>
										</div>
										<Progress
											className="h-2"
											value={Number.parseFloat(successRate)}
										/>
									</div>

									<div className="space-y-2">
										<div className="flex items-center justify-between text-sm">
											<span>Error Rate</span>
											<span className="font-medium text-red-600">
												{errorRate}%
											</span>
										</div>
										<Progress
											className="h-2"
											value={Number.parseFloat(errorRate)}
										/>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent className="space-y-4" value="tasks">
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-sm">Task Statistics</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="grid grid-cols-3 gap-4 text-center">
										<div>
											<div className="font-bold text-2xl text-gray-900">
												{metrics.totalTasks}
											</div>
											<div className="text-gray-600 text-xs">Total</div>
										</div>
										<div>
											<div className="font-bold text-2xl text-green-600">
												{metrics.completedTasks}
											</div>
											<div className="text-gray-600 text-xs">Completed</div>
										</div>
										<div>
											<div className="font-bold text-2xl text-red-600">
												{metrics.failedTasks}
											</div>
											<div className="text-gray-600 text-xs">Failed</div>
										</div>
									</div>

									<Separator />

									<div className="space-y-2">
										<div className="flex items-center justify-between text-sm">
											<div className="flex items-center space-x-1">
												<CheckCircle className="h-3 w-3 text-green-500" />
												<span>Completed Tasks</span>
											</div>
											<span>{metrics.completedTasks}</span>
										</div>
										<Progress
											className="h-2"
											value={
												metrics.totalTasks > 0
													? (metrics.completedTasks / metrics.totalTasks) * 100
													: 0
											}
										/>
									</div>

									<div className="space-y-2">
										<div className="flex items-center justify-between text-sm">
											<div className="flex items-center space-x-1">
												<AlertTriangle className="h-3 w-3 text-red-500" />
												<span>Failed Tasks</span>
											</div>
											<span>{metrics.failedTasks}</span>
										</div>
										<Progress
											className="h-2"
											value={
												metrics.totalTasks > 0
													? (metrics.failedTasks / metrics.totalTasks) * 100
													: 0
											}
										/>
									</div>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>

					{/* Actions */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Actions</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<Button className="w-full" size="sm" variant="outline">
								View Full History
							</Button>
							<Button className="w-full" size="sm" variant="outline">
								Restart Agent
							</Button>
							<Button className="w-full" size="sm" variant="outline">
								Export Metrics
							</Button>
						</CardContent>
					</Card>
				</div>
			</ScrollArea>
		</div>
	);
};
