"use client";

import {
	Activity,
	AlertTriangle,
	CheckCircle,
	Clock,
	Database,
	RefreshCw,
	TrendingUp,
	Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock database health data types
interface DatabaseHealth {
	status: "healthy" | "degraded" | "critical";
	connectionCount: number;
	queryLatency: number;
	errorRate: number;
	uptime: number;
	poolUtilization: number;
}

interface QueryMetric {
	query: string;
	count: number;
	avgLatency: number;
	errorCount: number;
}

interface ConnectionMetric {
	activeConnections: number;
	maxConnections: number;
	waitingQueries: number;
	connectionErrors: number;
}

export function DatabaseObservabilityDemo() {
	const [health, setHealth] = useState<DatabaseHealth>({
		status: "healthy",
		connectionCount: 5,
		queryLatency: 50,
		errorRate: 0,
		uptime: 99.9,
		poolUtilization: 45,
	});

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

	const [queryMetrics] = useState<QueryMetric[]>([
		{ query: "SELECT * FROM tasks", count: 1250, avgLatency: 25, errorCount: 2 },
		{ query: "UPDATE tasks SET status", count: 890, avgLatency: 35, errorCount: 1 },
		{ query: "INSERT INTO tasks", count: 456, avgLatency: 20, errorCount: 0 },
	]);

	const [connectionMetrics] = useState<ConnectionMetric>({
		activeConnections: 12,
		maxConnections: 100,
		waitingQueries: 3,
		connectionErrors: 1,
	});

	const refreshData = async () => {
		setLoading(true);
		try {
			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Simulate some variation in metrics
			setHealth((prev) => ({
				...prev,
				connectionCount: Math.floor(Math.random() * 10) + 3,
				queryLatency: Math.floor(Math.random() * 30) + 40,
				errorRate: Math.random() * 2,
				poolUtilization: Math.floor(Math.random() * 30) + 30,
			}));

			setLastRefresh(new Date());
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err : new Error("Failed to refresh data"));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// Auto-refresh every 30 seconds
		const interval = setInterval(refreshData, 30000);
		return () => clearInterval(interval);
	}, []);

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

	const formatLatency = (latency: number) => `${latency.toFixed(1)}ms`;
	const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

	if (error) {
		return (
			<main className="p-6">
				<Alert variant="destructive">
					<AlertTriangle className="h-4 w-4" />
					<AlertDescription>Database connection failed: {error.message}</AlertDescription>
				</Alert>
			</main>
		);
	}

	return (
		<main className="p-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Database Observability Demo</h1>
					<p className="text-gray-600">Monitor database health and performance metrics</p>
				</div>
				<div className="flex items-center space-x-2">
					<span className="text-sm text-gray-500">
						Last updated: {lastRefresh.toLocaleTimeString()}
					</span>
					<Button
						onClick={refreshData}
						disabled={loading}
						variant="outline"
						size="sm"
						className="flex items-center gap-2"
					>
						<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
						Refresh
					</Button>
				</div>
			</div>

			{/* Health Status Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Database Status</CardTitle>
						<Database className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="flex items-center space-x-2">
							<Badge className={getStatusColor(health.status)}>{health.status}</Badge>
							<span className="text-2xl font-bold">{formatPercentage(health.uptime)}</span>
						</div>
						<p className="text-xs text-muted-foreground mt-1">Uptime</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Connection Pool</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{health.connectionCount}</div>
						<Progress value={health.poolUtilization} className="mt-2" />
						<p className="text-xs text-muted-foreground mt-1">
							{formatPercentage(health.poolUtilization)} utilized
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Query Latency</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{formatLatency(health.queryLatency)}</div>
						<p className="text-xs text-muted-foreground mt-1">Average response time</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Error Rate</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{formatPercentage(health.errorRate)}</div>
						<p className="text-xs text-muted-foreground mt-1">
							{health.errorRate < 1
								? "Excellent"
								: health.errorRate < 5
									? "Good"
									: "Needs attention"}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Detailed Metrics */}
			<Tabs defaultValue="performance" className="space-y-4">
				<TabsList>
					<TabsTrigger value="performance">Query Performance</TabsTrigger>
					<TabsTrigger value="connections">Connections</TabsTrigger>
					<TabsTrigger value="health">Health Check</TabsTrigger>
				</TabsList>

				<TabsContent value="performance" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Top Queries</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{queryMetrics.map((metric, index) => (
									<div key={index} className="flex items-center justify-between p-3 border rounded">
										<div className="flex-1">
											<code className="text-sm bg-gray-100 px-2 py-1 rounded">{metric.query}</code>
											<div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
												<span>Count: {metric.count}</span>
												<span>Avg: {formatLatency(metric.avgLatency)}</span>
												<span className={metric.errorCount > 0 ? "text-red-600" : "text-green-600"}>
													Errors: {metric.errorCount}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="connections" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Card>
							<CardHeader>
								<CardTitle>Connection Pool Status</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="flex justify-between">
										<span>Active Connections</span>
										<Badge>{connectionMetrics.activeConnections}</Badge>
									</div>
									<div className="flex justify-between">
										<span>Max Connections</span>
										<span>{connectionMetrics.maxConnections}</span>
									</div>
									<div className="flex justify-between">
										<span>Waiting Queries</span>
										<Badge
											variant={connectionMetrics.waitingQueries > 5 ? "destructive" : "secondary"}
										>
											{connectionMetrics.waitingQueries}
										</Badge>
									</div>
									<div className="flex justify-between">
										<span>Connection Errors</span>
										<Badge
											variant={connectionMetrics.connectionErrors > 0 ? "destructive" : "secondary"}
										>
											{connectionMetrics.connectionErrors}
										</Badge>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Pool Utilization</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<div className="flex justify-between text-sm">
										<span>Current Usage</span>
										<span>{formatPercentage(health.poolUtilization)}</span>
									</div>
									<Progress value={health.poolUtilization} />
									<p className="text-xs text-muted-foreground">
										{connectionMetrics.activeConnections} of {connectionMetrics.maxConnections}{" "}
										connections in use
									</p>
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="health" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>System Health Indicators</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="flex items-center justify-between p-3 border rounded">
									<div className="flex items-center space-x-3">
										<CheckCircle className="h-5 w-5 text-green-600" />
										<div>
											<div className="font-medium">Database Connection</div>
											<div className="text-sm text-gray-500">Primary database responsive</div>
										</div>
									</div>
									<Badge className="bg-green-100 text-green-800">Healthy</Badge>
								</div>

								<div className="flex items-center justify-between p-3 border rounded">
									<div className="flex items-center space-x-3">
										<Activity className="h-5 w-5 text-blue-600" />
										<div>
											<div className="font-medium">Query Performance</div>
											<div className="text-sm text-gray-500">Average latency within bounds</div>
										</div>
									</div>
									<Badge className="bg-blue-100 text-blue-800">Optimal</Badge>
								</div>

								<div className="flex items-center justify-between p-3 border rounded">
									<div className="flex items-center space-x-3">
										<Users className="h-5 w-5 text-yellow-600" />
										<div>
											<div className="font-medium">Connection Pool</div>
											<div className="text-sm text-gray-500">Moderate utilization</div>
										</div>
									</div>
									<Badge className="bg-yellow-100 text-yellow-800">Good</Badge>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</main>
	);
}
