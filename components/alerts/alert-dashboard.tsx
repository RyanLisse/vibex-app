"use client";

import { format, formatDistanceToNow } from "date-fns";
import { Activity, AlertTriangle, Bell, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CriticalErrorType } from "@/lib/alerts/types";

// Type definitions that seem to be missing
interface CriticalError {
	id: string;
	type: CriticalErrorType;
	message: string;
	severity: string;
	source: string;
	timestamp: string;
	environment: string;
	occurrenceCount: number;
	firstOccurrence: string;
	lastOccurrence: string;
	correlationId?: string;
	metadata?: Record<string, unknown>;
	resolved?: boolean;
	resolvedAt?: string;
}

interface AlertMetrics {
	totalAlerts: number;
	unresolvedAlerts: number;
	averageResolutionTime?: number;
	alertsLast24Hours: number;
	alertsLast7Days: number;
	alertsByType?: Record<string, number>;
}

interface AlertDashboardProps {
	className?: string;
}

export function AlertDashboard({ className }: AlertDashboardProps) {
	const [activeAlerts, setActiveAlerts] = useState<CriticalError[]>([]);
	const [alertHistory, setAlertHistory] = useState<CriticalError[]>([]);
	const [metrics, setMetrics] = useState<AlertMetrics | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadDashboardData();

		// Refresh data every 30 seconds
		const interval = setInterval(loadDashboardData, 30_000);
		return () => clearInterval(interval);
	}, []);

	const loadDashboardData = async () => {
		try {
			setLoading(true);

			const [activeResponse, historyResponse, metricsResponse] = await Promise.all([
				fetch("/api/alerts/active"),
				fetch("/api/alerts/history"),
				fetch("/api/alerts/metrics"),
			]);

			if (!(activeResponse.ok && historyResponse.ok && metricsResponse.ok)) {
				throw new Error("Failed to fetch alert data");
			}

			const [activeData, historyData, metricsData] = await Promise.all([
				activeResponse.json(),
				historyResponse.json(),
				metricsResponse.json(),
			]);

			setActiveAlerts(activeData.alerts || []);
			setAlertHistory(historyData.alerts || []);
			setMetrics(metricsData);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load alert data");
		} finally {
			setLoading(false);
		}
	};

	const resolveAlert = async (alertId: string) => {
		try {
			const response = await fetch(`/api/alerts/${alertId}/resolve`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ resolvedBy: "user" }),
			});

			if (!response.ok) {
				throw new Error("Failed to resolve alert");
			}

			// Refresh data
			await loadDashboardData();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to resolve alert");
		}
	};

	const getSeverityColor = (severity: string) => {
		switch (severity) {
			case "critical":
				return "bg-red-500";
			case "high":
				return "bg-orange-500";
			case "medium":
				return "bg-yellow-500";
			case "low":
				return "bg-blue-500";
			default:
				return "bg-gray-500";
		}
	};

	const getSeverityIcon = (severity: string) => {
		switch (severity) {
			case "critical":
				return "🚨";
			case "high":
				return "⚠️";
			case "medium":
				return "📢";
			case "low":
				return "ℹ️";
			default:
				return "🔔";
		}
	};

	const formatErrorType = (type: CriticalErrorType) => {
		return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
	};

	if (loading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
			</div>
		);
	}

	return (
		<div className={className}>
			{error && (
				<Alert className="mb-6 border-red-200 bg-red-50">
					<AlertTriangle className="h-4 w-4" />
					<AlertDescription className="text-red-800">{error}</AlertDescription>
				</Alert>
			)}

			{/* Metrics Overview */}
			{metrics && (
				<div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">Active Alerts</CardTitle>
							<AlertTriangle className="h-4 w-4 text-red-500" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl text-red-600">{metrics.unresolvedAlerts}</div>
							<p className="text-muted-foreground text-xs">Requiring attention</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">Total Alerts</CardTitle>
							<Bell className="h-4 w-4 text-blue-500" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">{metrics.totalAlerts}</div>
							<p className="text-muted-foreground text-xs">All time</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">Avg Resolution</CardTitle>
							<Clock className="h-4 w-4 text-green-500" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{metrics.averageResolutionTime
									? `${Math.round(metrics.averageResolutionTime / 60_000)}m`
									: "N/A"}
							</div>
							<p className="text-muted-foreground text-xs">Time to resolve</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">Last 24h</CardTitle>
							<TrendingUp className="h-4 w-4 text-orange-500" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">{metrics.alertsLast24Hours}</div>
							<p className="text-muted-foreground text-xs">Recent activity</p>
						</CardContent>
					</Card>
				</div>
			)}

			<Tabs className="space-y-4" defaultValue="active">
				<TabsList>
					<TabsTrigger value="active">Active Alerts ({activeAlerts.length})</TabsTrigger>
					<TabsTrigger value="history">Alert History</TabsTrigger>
					<TabsTrigger value="metrics">Metrics & Analytics</TabsTrigger>
				</TabsList>

				<TabsContent className="space-y-4" value="active">
					{activeAlerts.length === 0 ? (
						<Card>
							<CardContent className="flex items-center justify-center py-12">
								<div className="text-center">
									<CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
									<h3 className="mb-2 font-medium text-gray-900 text-lg">No Active Alerts</h3>
									<p className="text-gray-500">All systems are operating normally.</p>
								</div>
							</CardContent>
						</Card>
					) : (
						<div className="space-y-4">
							{activeAlerts.map((alert) => (
								<Card className="border-l-4 border-l-red-500" key={alert.id}>
									<CardHeader>
										<div className="flex items-start justify-between">
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<span className="text-lg">{getSeverityIcon(alert.severity)}</span>
													<CardTitle className="text-lg">{formatErrorType(alert.type)}</CardTitle>
													<Badge className={getSeverityColor(alert.severity)}>
														{alert.severity}
													</Badge>
												</div>
												<CardDescription>
													{alert.source} • {formatDistanceToNow(new Date(alert.timestamp))} ago
												</CardDescription>
											</div>
											<Button
												className="ml-2"
												onClick={() => resolveAlert(alert.id)}
												size="sm"
												variant="outline"
											>
												Resolve
											</Button>
										</div>
									</CardHeader>
									<CardContent>
										<p className="mb-4 text-gray-700">{alert.message}</p>

										<div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
											<div>
												<div className="font-medium text-gray-500">Environment</div>
												<div>{alert.environment}</div>
											</div>
											<div>
												<div className="font-medium text-gray-500">Occurrences</div>
												<div>{alert.occurrenceCount}</div>
											</div>
											<div>
												<div className="font-medium text-gray-500">First Seen</div>
												<div>{format(new Date(alert.firstOccurrence), "MMM d, HH:mm")}</div>
											</div>
											<div>
												<div className="font-medium text-gray-500">Last Seen</div>
												<div>{format(new Date(alert.lastOccurrence), "MMM d, HH:mm")}</div>
											</div>
										</div>

										{alert.correlationId && (
											<div className="mt-4 rounded bg-gray-50 p-3">
												<div className="font-medium text-gray-500 text-sm">Correlation ID</div>
												<code className="font-mono text-sm">{alert.correlationId}</code>
											</div>
										)}

										{Object.keys(alert.metadata || {}).length > 0 && (
											<details className="mt-4">
												<summary className="cursor-pointer font-medium text-gray-700">
													Additional Details
												</summary>
												<pre className="mt-2 overflow-auto rounded bg-gray-50 p-3 text-sm">
													{JSON.stringify(alert.metadata, null, 2)}
												</pre>
											</details>
										)}
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</TabsContent>

				<TabsContent className="space-y-4" value="history">
					<div className="space-y-4">
						{alertHistory.slice(0, 20).map((alert) => (
							<Card className={`${alert.resolved ? "bg-gray-50" : ""}`} key={alert.id}>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<span className="text-sm">{getSeverityIcon(alert.severity)}</span>
												<CardTitle className="text-base">{formatErrorType(alert.type)}</CardTitle>
												<Badge
													className={alert.resolved ? "" : getSeverityColor(alert.severity)}
													variant={alert.resolved ? "secondary" : "default"}
												>
													{alert.resolved ? "Resolved" : alert.severity}
												</Badge>
											</div>
											<CardDescription>
												{alert.source} • {format(new Date(alert.timestamp), "MMM d, yyyy HH:mm")}
												{alert.resolved && alert.resolvedAt && (
													<> • Resolved {formatDistanceToNow(new Date(alert.resolvedAt))} ago</>
												)}
											</CardDescription>
										</div>
										{alert.resolved && <CheckCircle className="h-5 w-5 text-green-500" />}
									</div>
								</CardHeader>
								<CardContent className="pt-0">
									<p className="text-gray-700 text-sm">{alert.message}</p>
								</CardContent>
							</Card>
						))}
					</div>
				</TabsContent>

				<TabsContent className="space-y-4" value="metrics">
					{metrics && (
						<div className="grid gap-6 md:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Activity className="h-5 w-5" />
										Alerts by Type
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										{Object.entries(metrics.alertsByType || {}).map(([type, count]) => (
											<div className="flex items-center justify-between" key={type}>
												<span className="text-sm">
													{formatErrorType(type as CriticalErrorType)}
												</span>
												<Badge variant="secondary">{count}</Badge>
											</div>
										))}
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<TrendingUp className="h-5 w-5" />
										Recent Activity
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										<div className="flex justify-between">
											<span className="text-sm">Last 24 hours</span>
											<Badge variant="secondary">{metrics.alertsLast24Hours}</Badge>
										</div>
										<div className="flex justify-between">
											<span className="text-sm">Last 7 days</span>
											<Badge variant="secondary">{metrics.alertsLast7Days}</Badge>
										</div>
										<div className="flex justify-between">
											<span className="text-sm">Unresolved</span>
											<Badge variant={metrics.unresolvedAlerts > 0 ? "destructive" : "secondary"}>
												{metrics.unresolvedAlerts}
											</Badge>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
