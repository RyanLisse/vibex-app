"use client";

import { Activity, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { CriticalErrorType } from "@/lib/alerts/types";

// Define missing types locally
interface AlertMetrics {
	totalAlerts: number;
	resolvedAlerts: number;
	activeAlerts: number;
	errorsByType: Record<string, number>;
	alertsByHour: Array<{ hour: string; count: number }>;
}

interface AlertMetricsChartProps {
	className?: string;
}

export function AlertMetricsChart({ className }: AlertMetricsChartProps) {
	const [metrics, setMetrics] = useState<AlertMetrics | null>(null);
	const [loading, setLoading] = useState(true);
	const [timeframe, setTimeframe] = useState("24h");
	const [error, setError] = useState<string | null>(null);

	const loadMetrics = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/alerts/metrics?timeframe=${timeframe}`);

			if (!response.ok) {
				throw new Error("Failed to fetch metrics");
			}

			const data = await response.json();
			setMetrics(data);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load metrics");
		} finally {
			setLoading(false);
		}
	}, [timeframe]);

	useEffect(() => {
		loadMetrics();

		// Refresh metrics every minute
		const interval = setInterval(loadMetrics, 60_000);
		return () => clearInterval(interval);
	}, [loadMetrics]);

	if (loading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
			</div>
		);
	}

	if (error || !metrics) {
		return (
			<Card className="border-red-200 bg-red-50">
				<CardContent className="p-6">
					<div className="flex items-center gap-2 text-red-600">
						<AlertTriangle className="h-5 w-5" />
						<span>{error || "No metrics available"}</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Prepare data for charts
	const alertsByTypeData = Object.entries(metrics.alertsByType || {}).map(([type, count]) => ({
		name: type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
		value: count,
		type,
	}));

	const alertsByChannelData = Object.entries(metrics.alertsByChannel || {}).map(
		([channel, count]) => ({
			name: channel.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
			value: count,
			channel,
		})
	);

	// Colors for charts
	const SEVERITY_COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6", "#6b7280"];
	const CHANNEL_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

	const formatDuration = (ms: number) => {
		if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
		if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
		return `${Math.round(ms / 3_600_000)}h`;
	};

	return (
		<div className={className}>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h3 className="font-medium text-lg">Alert Analytics</h3>
					<p className="text-gray-600">Detailed metrics and visualizations</p>
				</div>
				<Select onValueChange={setTimeframe} value={timeframe}>
					<SelectTrigger className="w-32">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="1h">Last Hour</SelectItem>
						<SelectItem value="24h">Last 24h</SelectItem>
						<SelectItem value="7d">Last 7 days</SelectItem>
						<SelectItem value="30d">Last 30 days</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Resolution Time</CardTitle>
						<Clock className="h-4 w-4 text-blue-500" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{metrics.averageResolutionTime
								? formatDuration(metrics.averageResolutionTime)
								: "N/A"}
						</div>
						<p className="text-muted-foreground text-xs">Average time to resolve</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Alert Rate</CardTitle>
						<TrendingUp className="h-4 w-4 text-orange-500" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{timeframe === "24h" ? metrics.alertsLast24Hours : metrics.totalAlerts}
						</div>
						<p className="text-muted-foreground text-xs">Alerts in {timeframe}</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Mean Time to Alert</CardTitle>
						<Activity className="h-4 w-4 text-green-500" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{metrics.meanTimeToAlert ? formatDuration(metrics.meanTimeToAlert) : "N/A"}
						</div>
						<p className="text-muted-foreground text-xs">Detection to notification</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Resolution Rate</CardTitle>
						<AlertTriangle className="h-4 w-4 text-red-500" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{metrics.totalAlerts > 0
								? Math.round(
										((metrics.totalAlerts - metrics.unresolvedAlerts) / metrics.totalAlerts) * 100
									)
								: 0}
							%
						</div>
						<p className="text-muted-foreground text-xs">Alerts resolved</p>
					</CardContent>
				</Card>
			</div>

			<div className="mb-6 grid gap-6 md:grid-cols-2">
				{/* Alerts by Type */}
				<Card>
					<CardHeader>
						<CardTitle>Alerts by Type</CardTitle>
						<CardDescription>Distribution of error types</CardDescription>
					</CardHeader>
					<CardContent>
						{alertsByTypeData.length > 0 ? (
							<ResponsiveContainer height={300} width="100%">
								<BarChart data={alertsByTypeData}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis angle={-45} dataKey="name" fontSize={12} height={80} textAnchor="end" />
									<YAxis />
									<Tooltip />
									<Bar dataKey="value" fill="#8884d8" />
								</BarChart>
							</ResponsiveContainer>
						) : (
							<div className="flex h-64 items-center justify-center text-gray-500">
								No alerts in selected timeframe
							</div>
						)}
					</CardContent>
				</Card>

				{/* Alerts by Channel */}
				<Card>
					<CardHeader>
						<CardTitle>Alerts by Channel</CardTitle>
						<CardDescription>Notification distribution</CardDescription>
					</CardHeader>
					<CardContent>
						{alertsByChannelData.length > 0 ? (
							<ResponsiveContainer height={300} width="100%">
								<PieChart>
									<Pie
										cx="50%"
										cy="50%"
										data={alertsByChannelData}
										dataKey="value"
										fill="#8884d8"
										label={({ name, value }) => `${name}: ${value}`}
										outerRadius={80}
									>
										{alertsByChannelData.map((entry, index) => (
											<Cell
												fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
												key={`cell-${index}`}
											/>
										))}
									</Pie>
									<Tooltip />
								</PieChart>
							</ResponsiveContainer>
						) : (
							<div className="flex h-64 items-center justify-center text-gray-500">
								No channel data available
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Detailed Breakdown */}
			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Error Type Details</CardTitle>
						<CardDescription>Breakdown by error category</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{alertsByTypeData.map((item, index) => (
								<div className="flex items-center justify-between" key={item.type}>
									<div className="flex items-center gap-2">
										<div
											className="h-3 w-3 rounded-full"
											style={{
												backgroundColor: SEVERITY_COLORS[index % SEVERITY_COLORS.length],
											}}
										/>
										<span className="font-medium text-sm">{item.name}</span>
									</div>
									<div className="text-gray-600 text-sm">{item.value}</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Performance Metrics</CardTitle>
						<CardDescription>System performance indicators</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="font-medium text-sm">Mean Time to Resolution</span>
								<span className="text-gray-600 text-sm">
									{metrics.meanTimeToResolution
										? formatDuration(metrics.meanTimeToResolution)
										: "N/A"}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="font-medium text-sm">Total Alerts</span>
								<span className="text-gray-600 text-sm">{metrics.totalAlerts}</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="font-medium text-sm">Unresolved Alerts</span>
								<span className="text-gray-600 text-sm">{metrics.unresolvedAlerts}</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="font-medium text-sm">Last 7 Days</span>
								<span className="text-gray-600 text-sm">{metrics.alertsLast7Days}</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
