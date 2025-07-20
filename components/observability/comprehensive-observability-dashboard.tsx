"use client";

/**
 * Comprehensive Observability Dashboard
 *
 * Master dashboard combining time-travel debugging, migration monitoring,
 * agent coordination, performance metrics, and system health visualization.
 */

	Activity,
	AlertTriangle,
	BarChart3,
	CheckCircle,
	Clock,
	Cpu,
	Database,
	Download,
	Eye,
	HardDrive,
	MemoryStick,
	Monitor,
	Network,
	RefreshCw,
	Settings,
	TrendingUp,
	Users,
	Wifi,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { observability } from "@/lib/observability";
import { timeTravel } from "@/lib/time-travel";
import { AgentCoordinationMonitor } from "./agent-coordination-monitor";
import { MigrationProgressMonitor } from "./migration-progress-monitor";
import { TimelineVisualization } from "./timeline-visualization";

interface SystemHealth {
	overall: number;
	components: {
		database: number;
		migration: number;
		agents: number;
		timeTravel: number;
		network: number;
	};
	alerts: {
		id: string;
		severity: "info" | "warning" | "error" | "critical";
		message: string;
		timestamp: Date;
		component: string;
	}[];
}

interface PerformanceMetrics {
	cpu: {
		usage: number;
		cores: number;
		temperature?: number;
	};
	memory: {
		used: number;
		total: number;
		percentage: number;
	};
	disk: {
		used: number;
		total: number;
		percentage: number;
	};
	network: {
		bytesIn: number;
		bytesOut: number;
		latency: number;
	};
	database: {
		connections: number;
		queryRate: number;
		avgResponseTime: number;
	};
}

interface SystemOverview {
	uptime: number;
	version: string;
	environment: string;
	lastUpdate: Date;
	activeProcesses: number;
	totalRequests: number;
	errorRate: number;
}

interface ComprehensiveObservabilityDashboardProps {
	defaultTab?: string;
	autoRefresh?: boolean;
	refreshInterval?: number;
	className?: string;
}

export function ComprehensiveObservabilityDashboard({
	defaultTab = "overview",
	autoRefresh = true,
	refreshInterval = 10_000,
	className = "",
}: ComprehensiveObservabilityDashboardProps) {
	const [activeTab, setActiveTab] = useState(defaultTab);
	const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
	const [performanceMetrics, setPerformanceMetrics] =
		useState<PerformanceMetrics | null>(null);
	const [systemOverview, setSystemOverview] = useState<SystemOverview | null>(
		null,
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Fetch dashboard data
	const fetchDashboardData = useCallback(async () => {
		try {
			setIsRefreshing(true);
			setError(null);

			// Simulate fetching comprehensive dashboard data
			const mockSystemHealth: SystemHealth = {
				overall: 87,
				components: {
					database: 92,
					migration: 78,
					agents: 89,
					timeTravel: 95,
					network: 84,
				},
				alerts: [
					{
						id: "alert_001",
						severity: "warning",
						message: "Migration task_004 failed - retrying automatically",
						timestamp: new Date(Date.now() - 120_000),
						component: "migration",
					},
					{
						id: "alert_002",
						severity: "info",
						message: "Agent coordination efficiency above 85%",
						timestamp: new Date(Date.now() - 300_000),
						component: "agents",
					},
					{
						id: "alert_003",
						severity: "error",
						message: "Database connection pool near capacity",
						timestamp: new Date(Date.now() - 60_000),
						component: "database",
					},
				],
			};

			const mockPerformanceMetrics: PerformanceMetrics = {
				cpu: {
					usage: 34,
					cores: 8,
					temperature: 68,
				},
				memory: {
					used: 6.2,
					total: 16,
					percentage: 38.8,
				},
				disk: {
					used: 245,
					total: 512,
					percentage: 47.9,
				},
				network: {
					bytesIn: 1_247_369,
					bytesOut: 892_456,
					latency: 23,
				},
				database: {
					connections: 47,
					queryRate: 234,
					avgResponseTime: 45,
				},
			};

			const mockSystemOverview: SystemOverview = {
				uptime: 86_400 * 3 + 3600 * 4 + 1200, // 3 days, 4 hours, 20 minutes
				version: "2.1.0",
				environment: "production",
				lastUpdate: new Date(Date.now() - 3_600_000), // 1 hour ago
				activeProcesses: 156,
				totalRequests: 45_672,
				errorRate: 0.23,
			};

			setSystemHealth(mockSystemHealth);
			setPerformanceMetrics(mockPerformanceMetrics);
			setSystemOverview(mockSystemOverview);
			setLastRefresh(new Date());

			// Record observability event
			await observability.recordEvent("dashboard_data_fetched", {
				systemHealth: mockSystemHealth.overall,
				alertCount: mockSystemHealth.alerts.length,
				criticalAlerts: mockSystemHealth.alerts.filter(
					(a) => a.severity === "critical",
				).length,
			});
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to fetch dashboard data",
			);
			console.error("Failed to fetch dashboard data:", err);
		} finally {
			setLoading(false);
			setIsRefreshing(false);
		}
	}, []);

	// Auto refresh effect
	useEffect(() => {
		fetchDashboardData();

		if (autoRefresh) {
			const interval = setInterval(fetchDashboardData, refreshInterval);
			return () => clearInterval(interval);
		}
	}, [fetchDashboardData, autoRefresh, refreshInterval]);

	// Format uptime
	const formatUptime = useCallback((seconds: number): string => {
		const days = Math.floor(seconds / 86_400);
		const hours = Math.floor((seconds % 86_400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (days > 0) {
			return `${days}d ${hours}h ${minutes}m`;
		}
		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	}, []);

	// Format bytes
	const formatBytes = useCallback((bytes: number): string => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024)
			return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	}, []);

	// Get health color
	const getHealthColor = useCallback((score: number): string => {
		if (score >= 90) return "text-green-600";
		if (score >= 70) return "text-yellow-600";
		if (score >= 50) return "text-orange-600";
		return "text-red-600";
	}, []);

	// Get alert color
	const getAlertColor = useCallback((severity: string): string => {
		switch (severity) {
			case "critical":
				return "bg-red-500";
			case "error":
				return "bg-red-400";
			case "warning":
				return "bg-yellow-500";
			case "info":
				return "bg-blue-500";
			default:
				return "bg-gray-500";
		}
	}, []);

	if (loading) {
		return (
			<Card className={className}>
				<CardContent className="p-6">
					<div className="flex items-center justify-center">
						<Activity className="mr-2 h-5 w-5 animate-spin" />
						Loading observability dashboard...
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className={className}>
				<CardContent className="p-6">
					<div className="flex items-center text-red-600">
						<AlertTriangle className="mr-2 h-5 w-5" />
						{error}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Dashboard Header */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-3">
							<Monitor className="h-6 w-6" />
							<div>
								<CardTitle>Comprehensive Observability Dashboard</CardTitle>
								<p className="mt-1 text-gray-600 text-sm">
									Real-time monitoring of system components and performance
								</p>
							</div>
						</div>
						<div className="flex items-center space-x-2">
							<Badge variant="outline">
								Last updated: {lastRefresh.toLocaleTimeString()}
							</Badge>
							<Button
								disabled={isRefreshing}
								onClick={fetchDashboardData}
								size="sm"
								variant="outline"
							>
								<RefreshCw
									className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
								/>
							</Button>
							<Button size="sm" variant="outline">
								<Settings className="h-4 w-4" />
							</Button>
							<Button size="sm" variant="outline">
								<Download className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</CardHeader>
			</Card>

			{/* System Health Overview */}
			{systemHealth && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<Activity className="mr-2 h-5 w-5" />
							System Health Overview
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
							{/* Overall Health */}
							<div className="text-center">
								<div
									className={`font-bold text-4xl ${getHealthColor(systemHealth.overall)}`}
								>
									{systemHealth.overall}%
								</div>
								<div className="font-medium text-lg">Overall Health</div>
								<Progress className="mt-2" value={systemHealth.overall} />
							</div>

							{/* Component Health */}
							<div className="space-y-3">
								<h3 className="font-medium">Component Health</h3>
								{Object.entries(systemHealth.components).map(
									([component, score]) => (
										<div
											className="flex items-center justify-between"
											key={component}
										>
											<span className="text-sm capitalize">{component}:</span>
											<div className="flex items-center space-x-2">
												<span
													className={`font-medium text-sm ${getHealthColor(score)}`}
												>
													{score}%
												</span>
												<div className="w-16">
													<Progress className="h-2" value={score} />
												</div>
											</div>
										</div>
									),
								)}
							</div>

							{/* Recent Alerts */}
							<div className="space-y-3">
								<h3 className="font-medium">Recent Alerts</h3>
								<div className="max-h-32 space-y-2 overflow-y-auto">
									{systemHealth.alerts.slice(0, 3).map((alert) => (
										<div
											className="flex items-start space-x-2 text-sm"
											key={alert.id}
										>
											<div
												className={`mt-1.5 h-2 w-2 rounded-full ${getAlertColor(alert.severity)}`}
											/>
											<div className="flex-1">
												<div className="font-medium">{alert.message}</div>
												<div className="text-gray-500 text-xs">
													{alert.component} •{" "}
													{alert.timestamp.toLocaleTimeString()}
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Performance Metrics */}
			{performanceMetrics && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<BarChart3 className="mr-2 h-5 w-5" />
							Performance Metrics
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-6 md:grid-cols-4">
							{/* CPU */}
							<div className="text-center">
								<div className="mb-2 flex items-center justify-center">
									<Cpu className="h-8 w-8 text-blue-600" />
								</div>
								<div className="font-bold text-2xl">
									{performanceMetrics.cpu.usage}%
								</div>
								<div className="text-gray-600 text-sm">CPU Usage</div>
								<div className="text-gray-500 text-xs">
									{performanceMetrics.cpu.cores} cores
								</div>
								<Progress
									className="mt-2"
									value={performanceMetrics.cpu.usage}
								/>
							</div>

							{/* Memory */}
							<div className="text-center">
								<div className="mb-2 flex items-center justify-center">
									<MemoryStick className="h-8 w-8 text-green-600" />
								</div>
								<div className="font-bold text-2xl">
									{performanceMetrics.memory.percentage}%
								</div>
								<div className="text-gray-600 text-sm">Memory</div>
								<div className="text-gray-500 text-xs">
									{performanceMetrics.memory.used}GB /{" "}
									{performanceMetrics.memory.total}GB
								</div>
								<Progress
									className="mt-2"
									value={performanceMetrics.memory.percentage}
								/>
							</div>

							{/* Disk */}
							<div className="text-center">
								<div className="mb-2 flex items-center justify-center">
									<HardDrive className="h-8 w-8 text-purple-600" />
								</div>
								<div className="font-bold text-2xl">
									{performanceMetrics.disk.percentage}%
								</div>
								<div className="text-gray-600 text-sm">Disk</div>
								<div className="text-gray-500 text-xs">
									{performanceMetrics.disk.used}GB /{" "}
									{performanceMetrics.disk.total}GB
								</div>
								<Progress
									className="mt-2"
									value={performanceMetrics.disk.percentage}
								/>
							</div>

							{/* Network */}
							<div className="text-center">
								<div className="mb-2 flex items-center justify-center">
									<Wifi className="h-8 w-8 text-orange-600" />
								</div>
								<div className="font-bold text-2xl">
									{performanceMetrics.network.latency}ms
								</div>
								<div className="text-gray-600 text-sm">Network Latency</div>
								<div className="text-gray-500 text-xs">
									↓{formatBytes(performanceMetrics.network.bytesIn)} ↑
									{formatBytes(performanceMetrics.network.bytesOut)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* System Overview */}
			{systemOverview && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<TrendingUp className="mr-2 h-5 w-5" />
							System Overview
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-6 md:grid-cols-4">
							<div>
								<div className="font-bold text-2xl">
									{formatUptime(systemOverview.uptime)}
								</div>
								<div className="text-gray-600 text-sm">Uptime</div>
							</div>
							<div>
								<div className="font-bold text-2xl">
									{systemOverview.version}
								</div>
								<div className="text-gray-600 text-sm">Version</div>
							</div>
							<div>
								<div className="font-bold text-2xl">
									{systemOverview.totalRequests.toLocaleString()}
								</div>
								<div className="text-gray-600 text-sm">Total Requests</div>
							</div>
							<div>
								<div className="font-bold text-2xl text-green-600">
									{systemOverview.errorRate}%
								</div>
								<div className="text-gray-600 text-sm">Error Rate</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Detailed Monitoring Tabs */}
			<Card>
				<CardHeader>
					<CardTitle>Detailed Monitoring</CardTitle>
				</CardHeader>
				<CardContent>
					<Tabs
						className="w-full"
						onValueChange={setActiveTab}
						value={activeTab}
					>
						<TabsList className="grid w-full grid-cols-4">
							<TabsTrigger className="flex items-center" value="time-travel">
								<Clock className="mr-2 h-4 w-4" />
								Time Travel
							</TabsTrigger>
							<TabsTrigger className="flex items-center" value="migration">
								<Database className="mr-2 h-4 w-4" />
								Migration
							</TabsTrigger>
							<TabsTrigger className="flex items-center" value="agents">
								<Users className="mr-2 h-4 w-4" />
								Agents
							</TabsTrigger>
							<TabsTrigger className="flex items-center" value="performance">
								<Zap className="mr-2 h-4 w-4" />
								Performance
							</TabsTrigger>
						</TabsList>

						<TabsContent className="mt-6" value="time-travel">
							<TimelineVisualization
								executionId="execution_001"
								onSnapshotSelected={(snapshot) => {
									console.log("Selected snapshot:", snapshot);
								}}
								onStateChanged={(state) => {
									console.log("State changed:", state);
								}}
							/>
						</TabsContent>

						<TabsContent className="mt-6" value="migration">
							<MigrationProgressMonitor
								autoRefresh={autoRefresh}
								migrationId="migration_001"
								refreshInterval={refreshInterval}
							/>
						</TabsContent>

						<TabsContent className="mt-6" value="agents">
							<AgentCoordinationMonitor
								autoRefresh={autoRefresh}
								refreshInterval={refreshInterval}
							/>
						</TabsContent>

						<TabsContent className="mt-6" value="performance">
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
								<Card>
									<CardHeader>
										<CardTitle>Database Performance</CardTitle>
									</CardHeader>
									<CardContent>
										{performanceMetrics && (
											<div className="space-y-4">
												<div className="flex items-center justify-between">
													<span>Active Connections:</span>
													<span className="font-medium">
														{performanceMetrics.database.connections}
													</span>
												</div>
												<div className="flex items-center justify-between">
													<span>Query Rate:</span>
													<span className="font-medium">
														{performanceMetrics.database.queryRate}/sec
													</span>
												</div>
												<div className="flex items-center justify-between">
													<span>Avg Response Time:</span>
													<span className="font-medium">
														{performanceMetrics.database.avgResponseTime}ms
													</span>
												</div>
											</div>
										)}
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>System Resources</CardTitle>
									</CardHeader>
									<CardContent>
										{systemOverview && (
											<div className="space-y-4">
												<div className="flex items-center justify-between">
													<span>Active Processes:</span>
													<span className="font-medium">
														{systemOverview.activeProcesses}
													</span>
												</div>
												<div className="flex items-center justify-between">
													<span>Environment:</span>
													<span className="font-medium capitalize">
														{systemOverview.environment}
													</span>
												</div>
												<div className="flex items-center justify-between">
													<span>Last Update:</span>
													<span className="font-medium">
														{systemOverview.lastUpdate.toLocaleString()}
													</span>
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}
