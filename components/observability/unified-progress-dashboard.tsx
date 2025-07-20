"use client";

/**
 * Unified Progress Dashboard
 *
 * Comprehensive dashboard for monitoring all agent activities,
 * migration progress, and system performance in real-time.
 */

	Activity,
	AlertTriangle,
	CheckCircle,
	Clock,
	Cpu,
	Database,
	Eye,
	GitBranch,
	HardDrive,
	Network,
	Pause,
	Play,
	RefreshCw,
	TrendingUp,
	Users,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
	type AgentActivity,
	type AgentType,
	agentActivityTracker,
} from "@/lib/observability/agent-activity-tracker";
import { AgentCoordinationMonitor } from "./agent-coordination-monitor";
import { MigrationProgressMonitor } from "./migration-progress-monitor";
import { TimelineVisualization } from "./timeline-visualization";

interface UnifiedProgressDashboardProps {
	className?: string;
	autoRefresh?: boolean;
	refreshInterval?: number;
}

export function UnifiedProgressDashboard({
	className = "",
	autoRefresh = true,
	refreshInterval = 5000,
}: UnifiedProgressDashboardProps) {
	const [agents, setAgents] = useState<AgentActivity[]>([]);
	const [systemOverview, setSystemOverview] = useState<any>(null);
	const [migrationProgress, setMigrationProgress] = useState<any>(null);
	const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
	const [isPaused, setIsPaused] = useState(false);
	const [activeTab, setActiveTab] = useState("overview");
	const [loading, setLoading] = useState(true);

	// Fetch all data
	const fetchData = useCallback(async () => {
		if (isPaused) return;

		try {
			// Get agent activities
			const agentActivities = agentActivityTracker.getAllAgentActivities();
			setAgents(agentActivities);

			// Get system overview
			const overview = agentActivityTracker.getSystemOverview();
			setSystemOverview(overview);

			// Get migration progress
			const progress = agentActivityTracker.getMigrationProgress();
			setMigrationProgress(progress);

			setLoading(false);
		} catch (error) {
			console.error("Failed to fetch dashboard data:", error);
		}
	}, [isPaused]);

	// Auto refresh
	useEffect(() => {
		fetchData();

		if (autoRefresh && !isPaused) {
			const interval = setInterval(fetchData, refreshInterval);
			return () => clearInterval(interval);
		}
	}, [fetchData, autoRefresh, refreshInterval, isPaused]);

	// Get agent type color
	const getAgentTypeColor = useCallback((type: AgentType) => {
		const colors: Record<AgentType, string> = {
			frontend_developer: "bg-blue-500",
			backend_systems: "bg-green-500",
			data_migration: "bg-purple-500",
			devops_engineer: "bg-orange-500",
			observability_engineer: "bg-pink-500",
			quality_assurance: "bg-yellow-500",
			security_specialist: "bg-red-500",
			performance_optimizer: "bg-indigo-500",
		};
		return colors[type] || "bg-gray-500";
	}, []);

	// Get status icon
	const getStatusIcon = useCallback((status: string) => {
		switch (status) {
			case "active":
			case "processing":
				return <Activity className="h-4 w-4 animate-spin text-blue-600" />;
			case "completed":
				return <CheckCircle className="h-4 w-4 text-green-600" />;
			case "error":
			case "failed":
				return <AlertTriangle className="h-4 w-4 text-red-600" />;
			case "waiting":
				return <Clock className="h-4 w-4 text-yellow-600" />;
			default:
				return <Clock className="h-4 w-4 text-gray-400" />;
		}
	}, []);

	// Format agent type for display
	const formatAgentType = (type: AgentType): string => {
		return type
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	if (loading) {
		return (
			<Card className={className}>
				<CardContent className="p-6">
					<div className="flex items-center justify-center">
						<Activity className="mr-2 h-5 w-5 animate-spin" />
						Loading dashboard...
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Header */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center text-2xl">
							<Users className="mr-2 h-6 w-6" />
							Unified Progress Dashboard
						</CardTitle>
						<div className="flex items-center space-x-2">
							<Button
								onClick={() => setIsPaused(!isPaused)}
								size="sm"
								variant="outline"
							>
								{isPaused ? (
									<Play className="h-4 w-4" />
								) : (
									<Pause className="h-4 w-4" />
								)}
							</Button>
							<Button
								disabled={loading}
								onClick={fetchData}
								size="sm"
								variant="outline"
							>
								<RefreshCw
									className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
								/>
							</Button>
						</div>
					</div>
				</CardHeader>
			</Card>

			{/* System Overview */}
			{systemOverview && (
				<Card>
					<CardHeader>
						<CardTitle>System Overview</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
							<div className="text-center">
								<div className="font-bold text-3xl">
									{systemOverview.totalAgents}
								</div>
								<div className="text-gray-600 text-sm">Total Agents</div>
							</div>
							<div className="text-center">
								<div className="font-bold text-3xl text-blue-600">
									{systemOverview.activeAgents}
								</div>
								<div className="text-gray-600 text-sm">Active Agents</div>
							</div>
							<div className="text-center">
								<div className="font-bold text-3xl text-green-600">
									{systemOverview.completedTasks}
								</div>
								<div className="text-gray-600 text-sm">Completed Tasks</div>
							</div>
							<div className="text-center">
								<div className="font-bold text-3xl text-red-600">
									{systemOverview.failedTasks}
								</div>
								<div className="text-gray-600 text-sm">Failed Tasks</div>
							</div>
						</div>

						<div className="mt-6 grid grid-cols-3 gap-4">
							<div className="flex items-center">
								<Cpu className="mr-2 h-5 w-5 text-blue-600" />
								<div>
									<div className="font-medium text-sm">CPU Usage</div>
									<Progress
										className="mt-1"
										value={systemOverview.averageResourceUsage.cpu}
									/>
									<div className="mt-1 text-gray-600 text-xs">
										{systemOverview.averageResourceUsage.cpu.toFixed(1)}%
									</div>
								</div>
							</div>
							<div className="flex items-center">
								<HardDrive className="mr-2 h-5 w-5 text-green-600" />
								<div>
									<div className="font-medium text-sm">Memory Usage</div>
									<Progress
										className="mt-1"
										value={systemOverview.averageResourceUsage.memory}
									/>
									<div className="mt-1 text-gray-600 text-xs">
										{systemOverview.averageResourceUsage.memory.toFixed(1)}%
									</div>
								</div>
							</div>
							<div className="flex items-center">
								<Network className="mr-2 h-5 w-5 text-purple-600" />
								<div>
									<div className="font-medium text-sm">Network Usage</div>
									<Progress
										className="mt-1"
										value={systemOverview.averageResourceUsage.network}
									/>
									<div className="mt-1 text-gray-600 text-xs">
										{systemOverview.averageResourceUsage.network.toFixed(1)}%
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Tabs for different views */}
			<Tabs onValueChange={setActiveTab} value={activeTab}>
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="agents">Agents</TabsTrigger>
					<TabsTrigger value="migration">Migration</TabsTrigger>
					<TabsTrigger value="timeline">Timeline</TabsTrigger>
				</TabsList>

				<TabsContent value="overview">
					{/* Migration Progress Summary */}
					{migrationProgress && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center">
									<Database className="mr-2 h-5 w-5" />
									Migration Progress Summary
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div>
										<div className="mb-2 flex justify-between">
											<span className="font-medium text-sm">
												Overall Progress
											</span>
											<span className="text-gray-600 text-sm">
												{migrationProgress.overallProgress.toFixed(1)}%
											</span>
										</div>
										<Progress
											className="h-3"
											value={migrationProgress.overallProgress}
										/>
									</div>

									{migrationProgress.estimatedCompletion && (
										<div className="text-gray-600 text-sm">
											Estimated Completion:{" "}
											{migrationProgress.estimatedCompletion.toLocaleTimeString()}
										</div>
									)}

									{migrationProgress.blockers.length > 0 && (
										<div className="mt-4 rounded bg-yellow-50 p-3">
											<div className="flex items-center text-yellow-700">
												<AlertTriangle className="mr-2 h-4 w-4" />
												<span className="font-medium">Blockers Detected</span>
											</div>
											<ul className="mt-2 list-inside list-disc text-sm text-yellow-600">
												{migrationProgress.blockers.map(
													(blocker: string, index: number) => (
														<li key={index}>{blocker}</li>
													),
												)}
											</ul>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				<TabsContent value="agents">
					{/* Agent Activities Grid */}
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						{agents.map((agent) => (
							<Card
								className={`cursor-pointer transition-all ${
									selectedAgent === agent.agentId ? "ring-2 ring-blue-500" : ""
								}`}
								key={agent.agentId}
								onClick={() =>
									setSelectedAgent(
										selectedAgent === agent.agentId ? null : agent.agentId,
									)
								}
							>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-3">
											<div
												className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${getAgentTypeColor(agent.agentType)}`}
											>
												{agent.agentType.charAt(0).toUpperCase()}
											</div>
											<div>
												<h3 className="font-medium">
													{formatAgentType(agent.agentType)}
												</h3>
												<p className="text-gray-600 text-xs">{agent.agentId}</p>
											</div>
										</div>
										<div className="flex items-center space-x-2">
											{getStatusIcon(agent.status)}
											<Badge
												variant={
													agent.status === "active" ? "default" : "secondary"
												}
											>
												{agent.status}
											</Badge>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									{agent.currentTask ? (
										<div className="space-y-3">
											<div>
												<div className="font-medium text-sm">
													{agent.currentTask.name}
												</div>
												<div className="text-gray-600 text-xs">
													{agent.currentTask.description}
												</div>
											</div>
											<div>
												<div className="mb-1 flex justify-between">
													<span className="text-gray-600 text-xs">
														Progress
													</span>
													<span className="font-medium text-xs">
														{agent.currentTask.progress}%
													</span>
												</div>
												<Progress
													className="h-2"
													value={agent.currentTask.progress}
												/>
											</div>
											<div className="grid grid-cols-2 gap-2 text-xs">
												<div>
													<span className="text-gray-600">
														Tasks Completed:
													</span>
													<span className="ml-1 font-medium">
														{agent.metrics.tasksCompleted}
													</span>
												</div>
												<div>
													<span className="text-gray-600">Tasks Failed:</span>
													<span className="ml-1 font-medium text-red-600">
														{agent.metrics.tasksFailed}
													</span>
												</div>
											</div>
										</div>
									) : (
										<div className="text-gray-600 text-sm">No active task</div>
									)}

									{/* Resource Usage */}
									<div className="mt-4 border-t pt-4">
										<div className="grid grid-cols-3 gap-2 text-xs">
											<div className="text-center">
												<Cpu className="mx-auto mb-1 h-4 w-4 text-blue-600" />
												<div>{agent.metrics.resourceUsage.cpu.toFixed(1)}%</div>
											</div>
											<div className="text-center">
												<HardDrive className="mx-auto mb-1 h-4 w-4 text-green-600" />
												<div>
													{agent.metrics.resourceUsage.memory.toFixed(1)}%
												</div>
											</div>
											<div className="text-center">
												<Network className="mx-auto mb-1 h-4 w-4 text-purple-600" />
												<div>
													{agent.metrics.resourceUsage.network.toFixed(1)}%
												</div>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</TabsContent>

				<TabsContent value="migration">
					<MigrationProgressMonitor />
				</TabsContent>

				<TabsContent value="timeline">
					<TimelineVisualization />
				</TabsContent>
			</Tabs>

			{/* Agent Coordination Monitor */}
			<AgentCoordinationMonitor />
		</div>
	);
}
