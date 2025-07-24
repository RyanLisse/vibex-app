/**
 * Enhanced Observability Dashboard Component
 *
 * Real-time dashboard displaying system health, performance metrics,
 * agent execution tracking, and event streaming.
 */

"use client";

import {
	Activity,
	AlertTriangle,
	CheckCircle,
	Clock,
	Cpu,
	Database,
	Memory,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types
interface SystemHealthMetrics {
	overall: {
		status: "healthy" | "degraded" | "critical";
		score: number;
	};
	executions: {
		total: number;
		successful: number;
		failed: number;
		successRate: number;
		averageDuration: number;
		p95Duration: number;
	};
	errors: {
		total: number;
		rate: number;
		byType: Record<string, number>;
		recentErrors: Array<{
			type: string;
			message: string;
			timestamp: Date;
			count: number;
		}>;
	};
	performance: {
		averageResponseTime: number;
		throughput: number;
		memoryUsage: number;
		cpuUsage: number;
	};
	agents: {
		active: number;
		byType: Record<string, number>;
		averageExecutionTime: Record<string, number>;
		errorRates: Record<string, number>;
	};
}

interface RealtimeData {
	activeExecutions: number;
	executionsByType: Record<string, number>;
	streaming: {
		subscriptionsCount: number;
		eventsBuffered: number;
		eventsPerSecond: number;
		memoryUsage: number;
		pollingLatency: number;
	};
	subscriptions: {
		total: number;
		active: number;
		byType: Record<string, number>;
		bySeverity: Record<string, number>;
	};
}

interface ObservabilityEvent {
	id: string;
	type: string;
	severity: "debug" | "info" | "warn" | "error" | "critical";
	message: string;
	timestamp: Date;
	source: string;
	tags: string[];
	metadata: Record<string, any>;
}

export function ObservabilityDashboard() {
	const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetrics | null>(null);
	const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
	const [events, setEvents] = useState<ObservabilityEvent[]>([]);
	const [isConnected, setIsConnected] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch health metrics
	const fetchHealthMetrics = useCallback(async () => {
		try {
			const response = await fetch("/api/observability/health");
			if (!response.ok) throw new Error("Failed to fetch health metrics");

			const data = await response.json();
			setHealthMetrics(data.health);
			setRealtimeData(data.realtime);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	}, []);

	// Setup real-time event streaming
	useEffect(() => {
		const eventSource = new EventSource("/api/observability/events/stream");

		eventSource.onopen = () => {
			setIsConnected(true);
		};

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);

				if (data.type === "event") {
					setEvents((prev) => [data.data, ...prev.slice(0, 99)]); // Keep last 100 events
				}
			} catch (err) {
				console.error("Error parsing SSE event:", err);
			}
		};

		eventSource.onerror = () => {
			setIsConnected(false);
		};

		return () => {
			eventSource.close();
		};
	}, []);

	// Periodic health metrics refresh
	useEffect(() => {
		fetchHealthMetrics();
		const interval = setInterval(fetchHealthMetrics, 30000); // Every 30 seconds
		return () => clearInterval(interval);
	}, [fetchHealthMetrics]);

	// Clear cache action
	const handleClearCache = async () => {
		try {
			await fetch("/api/observability/health", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "clear_cache" }),
			});
			await fetchHealthMetrics();
		} catch (err) {
			console.error("Error clearing cache:", err);
		}
	};

	// Force flush events action
	const handleForceFlush = async () => {
		try {
			await fetch("/api/observability/health", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "force_flush" }),
			});
		} catch (err) {
			console.error("Error flushing events:", err);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
			</div>
		);
	}

	if (error) {
		return (
			<Alert variant="destructive">
				<AlertTriangle className="h-4 w-4" />
				<AlertDescription>Error loading observability data: {error}</AlertDescription>
			</Alert>
		);
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "healthy":
				return "text-green-600 bg-green-100";
			case "degraded":
				return "text-yellow-600 bg-yellow-100";
			case "critical":
				return "text-red-600 bg-red-100";
			default:
				return "text-gray-600 bg-gray-100";
		}
	};

	const getSeverityColor = (severity: string) => {
		switch (severity) {
			case "debug":
				return "text-gray-600 bg-gray-100";
			case "info":
				return "text-blue-600 bg-blue-100";
			case "warn":
				return "text-yellow-600 bg-yellow-100";
			case "error":
				return "text-red-600 bg-red-100";
			case "critical":
				return "text-red-800 bg-red-200";
			default:
				return "text-gray-600 bg-gray-100";
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Observability Dashboard</h1>
					<p className="text-gray-600">Real-time system monitoring and agent execution tracking</p>
				</div>
				<div className="flex items-center space-x-2">
					<Badge variant={isConnected ? "default" : "destructive"}>
						{isConnected ? "Connected" : "Disconnected"}
					</Badge>
					<Button onClick={handleClearCache} variant="outline" size="sm">
						Clear Cache
					</Button>
					<Button onClick={handleForceFlush} variant="outline" size="sm">
						Force Flush
					</Button>
				</div>
			</div>

			{/* System Health Overview */}
			{healthMetrics && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">System Health</CardTitle>
							<CheckCircle className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="flex items-center space-x-2">
								<Badge className={getStatusColor(healthMetrics.overall.status)}>
									{healthMetrics.overall.status}
								</Badge>
								<span className="text-2xl font-bold">{healthMetrics.overall.score}%</span>
							</div>
							<Progress value={healthMetrics.overall.score} className="mt-2" />
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Success Rate</CardTitle>
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{healthMetrics.executions.successRate.toFixed(1)}%
							</div>
							<p className="text-xs text-muted-foreground">
								{healthMetrics.executions.successful} / {healthMetrics.executions.total} executions
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
							<Clock className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{healthMetrics.executions.averageDuration}ms</div>
							<p className="text-xs text-muted-foreground">
								P95: {healthMetrics.executions.p95Duration}ms
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Active Agents</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{healthMetrics.agents.active}</div>
							<p className="text-xs text-muted-foreground">
								{realtimeData?.activeExecutions || 0} executing
							</p>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Detailed Metrics */}
			<Tabs defaultValue="executions" className="space-y-4">
				<TabsList>
					<TabsTrigger value="executions">Executions</TabsTrigger>
					<TabsTrigger value="errors">Errors</TabsTrigger>
					<TabsTrigger value="performance">Performance</TabsTrigger>
					<TabsTrigger value="events">Live Events</TabsTrigger>
				</TabsList>

				<TabsContent value="executions" className="space-y-4">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{/* Agent Types */}
						<Card>
							<CardHeader>
								<CardTitle>Agent Types</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{healthMetrics &&
										Object.entries(healthMetrics.agents.byType).map(([type, count]) => (
											<div key={type} className="flex items-center justify-between">
												<span className="text-sm">{type}</span>
												<div className="flex items-center space-x-2">
													<span className="text-sm font-medium">{count}</span>
													<span className="text-xs text-muted-foreground">
														({healthMetrics.agents.averageExecutionTime[type] || 0}
														ms avg)
													</span>
												</div>
											</div>
										))}
								</div>
							</CardContent>
						</Card>

						{/* Real-time Executions */}
						<Card>
							<CardHeader>
								<CardTitle>Real-time Activity</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<span className="text-sm">Active Executions</span>
										<Badge variant="outline">{realtimeData?.activeExecutions || 0}</Badge>
									</div>
									{realtimeData &&
										Object.entries(realtimeData.executionsByType).map(([type, count]) => (
											<div key={type} className="flex items-center justify-between">
												<span className="text-sm">{type}</span>
												<Badge variant="secondary">{count}</Badge>
											</div>
										))}
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="errors" className="space-y-4">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{/* Error Statistics */}
						<Card>
							<CardHeader>
								<CardTitle>Error Statistics</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<span className="text-sm">Total Errors</span>
										<Badge variant="destructive">{healthMetrics?.errors.total || 0}</Badge>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm">Error Rate</span>
										<span className="text-sm font-medium">
											{healthMetrics?.errors.rate.toFixed(2)}%
										</span>
									</div>
									{healthMetrics &&
										Object.entries(healthMetrics.errors.byType).map(([type, count]) => (
											<div key={type} className="flex items-center justify-between">
												<span className="text-sm">{type}</span>
												<Badge variant="outline">{count}</Badge>
											</div>
										))}
								</div>
							</CardContent>
						</Card>

						{/* Recent Errors */}
						<Card>
							<CardHeader>
								<CardTitle>Recent Errors</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2 max-h-64 overflow-y-auto">
									{healthMetrics?.errors.recentErrors.map((error, index) => (
										<div key={index} className="p-2 border rounded-sm">
											<div className="flex items-center justify-between">
												<Badge variant="destructive" className="text-xs">
													{error.type}
												</Badge>
												<span className="text-xs text-muted-foreground">
													{new Date(error.timestamp).toLocaleTimeString()}
												</span>
											</div>
											<p className="text-sm mt-1 truncate">{error.message}</p>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="performance" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
								<Memory className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{Math.round((healthMetrics?.performance.memoryUsage || 0) / 1024 / 1024)}
									MB
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Throughput</CardTitle>
								<Activity className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{healthMetrics?.performance.throughput.toFixed(2)}/s
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Events/sec</CardTitle>
								<Zap className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{realtimeData?.streaming.eventsPerSecond.toFixed(1)}
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
								<Database className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{realtimeData?.subscriptions.active || 0}</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="events" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Live Event Stream</CardTitle>
							<div className="flex items-center space-x-2">
								<Badge variant={isConnected ? "default" : "destructive"}>
									{isConnected ? "Connected" : "Disconnected"}
								</Badge>
								<span className="text-sm text-muted-foreground">{events.length} events</span>
							</div>
						</CardHeader>
						<CardContent>
							<div className="space-y-2 max-h-96 overflow-y-auto">
								{events.map((event) => (
									<div key={event.id} className="p-3 border rounded-sm">
										<div className="flex items-center justify-between mb-2">
											<div className="flex items-center space-x-2">
												<Badge className={getSeverityColor(event.severity)}>{event.severity}</Badge>
												<Badge variant="outline">{event.type}</Badge>
												<span className="text-sm text-muted-foreground">{event.source}</span>
											</div>
											<span className="text-xs text-muted-foreground">
												{new Date(event.timestamp).toLocaleTimeString()}
											</span>
										</div>
										<p className="text-sm">{event.message}</p>
										{event.tags.length > 0 && (
											<div className="flex flex-wrap gap-1 mt-2">
												{event.tags.map((tag, index) => (
													<Badge key={index} variant="secondary" className="text-xs">
														{tag}
													</Badge>
												))}
											</div>
										)}
									</div>
								))}
								{events.length === 0 && (
									<div className="text-center text-muted-foreground py-8">
										No events received yet
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
