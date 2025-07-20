"use client";

	Activity,
	Brain,
	Clock,
	Database,
	Eye,
	GitBranch,
	Play,
	Settings,
	TrendingUp,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MemoryBrowser } from "@/components/agent-memory/memory-browser";
import { DataTable } from "@/components/shared/data-table";
import { StatusIndicator } from "@/components/shared/status-indicator";
import { TimeTravelDebugger } from "@/components/time-travel/time-travel-debugger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowDesigner } from "@/components/workflow/workflow-designer";

interface DashboardProps {
	defaultTab?: string;
}

export function ObservabilityDashboard({
	defaultTab = "overview",
}: DashboardProps) {
	const [activeExecution, setActiveExecution] = useState<string | null>(null);
	const [recentExecutions, setRecentExecutions] = useState<any[]>([]);
	const [metrics, setMetrics] = useState<any>(null);

	useEffect(() => {
		// Load recent executions
		const loadRecentExecutions = async () => {
			try {
				const response = await fetch(
					"/api/observability/events?type=execution&limit=10",
				);
				const data = await response.json();
				setRecentExecutions(data.events || []);
			} catch (error) {
				console.error("Failed to load recent executions:", error);
			}
		};

		// Load metrics
		const loadMetrics = async () => {
			try {
				const response = await fetch("/api/observability/metrics");
				const data = await response.json();
				setMetrics(data);
			} catch (error) {
				console.error("Failed to load metrics:", error);
			}
		};

		loadRecentExecutions();
		loadMetrics();
	}, []);

	const executionColumns = [
		{
			key: "executionId",
			label: "Execution ID",
			render: (value: string) => (
				<span className="font-mono text-xs">{value.slice(0, 8)}...</span>
			),
		},
		{
			key: "type",
			label: "Type",
			render: (value: string) => <Badge variant="outline">{value}</Badge>,
		},
		{
			key: "category",
			label: "Category",
			render: (value: string) => <Badge variant="secondary">{value}</Badge>,
		},
		{
			key: "severity",
			label: "Status",
			render: (value: string) => <StatusIndicator status={value} />,
		},
		{
			key: "timestamp",
			label: "Time",
			render: (value: string) => (
				<span className="text-muted-foreground text-sm">
					{new Date(value).toLocaleTimeString()}
				</span>
			),
		},
	];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-4">
					<Activity className="h-6 w-6" />
					<h1 className="font-bold text-3xl">Database Observability</h1>
				</div>
			</div>

			<Tabs className="space-y-4" defaultValue={defaultTab}>
				<TabsList className="grid w-full grid-cols-5">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="time-travel">Time Travel</TabsTrigger>
					<TabsTrigger value="memory">Agent Memory</TabsTrigger>
					<TabsTrigger value="workflows">Workflows</TabsTrigger>
					<TabsTrigger value="analytics">Analytics</TabsTrigger>
				</TabsList>

				{/* Overview Tab */}
				<TabsContent className="space-y-6" value="overview">
					{/* Metrics Cards */}
					<div className="grid grid-cols-1 gap-6 md:grid-cols-4">
						<Card className="p-6">
							<div className="flex items-center space-x-2">
								<Database className="h-5 w-5 text-blue-500" />
								<span className="font-medium">Database Queries</span>
							</div>
							<div className="mt-2">
								<div className="font-bold text-2xl">
									{metrics?.current?.query_duration?.count || 0}
								</div>
								<div className="text-muted-foreground text-sm">
									Avg: {metrics?.current?.query_duration?.avg?.toFixed(2) || 0}
									ms
								</div>
							</div>
						</Card>

						<Card className="p-6">
							<div className="flex items-center space-x-2">
								<Zap className="h-5 w-5 text-green-500" />
								<span className="font-medium">Active Executions</span>
							</div>
							<div className="mt-2">
								<div className="font-bold text-2xl">12</div>
								<div className="text-muted-foreground text-sm">
									+3 from last hour
								</div>
							</div>
						</Card>

						<Card className="p-6">
							<div className="flex items-center space-x-2">
								<TrendingUp className="h-5 w-5 text-purple-500" />
								<span className="font-medium">Success Rate</span>
							</div>
							<div className="mt-2">
								<div className="font-bold text-2xl">98.5%</div>
								<div className="text-muted-foreground text-sm">
									Last 24 hours
								</div>
							</div>
						</Card>

						<Card className="p-6">
							<div className="flex items-center space-x-2">
								<Brain className="h-5 w-5 text-orange-500" />
								<span className="font-medium">Memory Entries</span>
							</div>
							<div className="mt-2">
								<div className="font-bold text-2xl">1,247</div>
								<div className="text-muted-foreground text-sm">+89 today</div>
							</div>
						</Card>
					</div>

					{/* Recent Activity */}
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<Card className="p-6">
							<h3 className="mb-4 font-semibold text-lg">Recent Executions</h3>
							<DataTable
								actions={{
									rowActions: (row: any) => (
										<Button
											onClick={() => setActiveExecution(row.executionId)}
											size="sm"
											variant="outline"
										>
											<Eye className="h-3 w-3" />
										</Button>
									),
								}}
								columns={executionColumns}
								data={recentExecutions}
							/>
						</Card>

						<Card className="p-6">
							<h3 className="mb-4 font-semibold text-lg">System Health</h3>
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<span>Database Connection</span>
									<StatusIndicator status="active" />
								</div>
								<div className="flex items-center justify-between">
									<span>ElectricSQL Sync</span>
									<StatusIndicator status="running" />
								</div>
								<div className="flex items-center justify-between">
									<span>Vector Search</span>
									<StatusIndicator status="active" />
								</div>
								<div className="flex items-center justify-between">
									<span>Background Jobs</span>
									<StatusIndicator status="processing" />
								</div>
								<div className="flex items-center justify-between">
									<span>Cache Layer</span>
									<StatusIndicator status="active" />
								</div>
							</div>
						</Card>
					</div>
				</TabsContent>

				{/* Time Travel Tab */}
				<TabsContent value="time-travel">
					{activeExecution ? (
						<TimeTravelDebugger
							executionId={activeExecution}
							onClose={() => setActiveExecution(null)}
						/>
					) : (
						<Card className="p-6">
							<div className="py-12 text-center">
								<Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
								<h3 className="mb-2 font-medium text-lg">
									Time-Travel Debugging
								</h3>
								<p className="mb-4 text-muted-foreground">
									Select an execution from the Recent Executions table to start
									debugging
								</p>
								<DataTable
									actions={{
										rowActions: (row: any) => (
											<Button
												onClick={() => setActiveExecution(row.executionId)}
												size="sm"
												variant="outline"
											>
												<GitBranch className="mr-1 h-3 w-3" />
												Debug
											</Button>
										),
									}}
									columns={executionColumns}
									data={recentExecutions}
								/>
							</div>
						</Card>
					)}
				</TabsContent>

				{/* Memory Tab */}
				<TabsContent value="memory">
					<MemoryBrowser />
				</TabsContent>

				{/* Workflows Tab */}
				<TabsContent value="workflows">
					<WorkflowDesigner />
				</TabsContent>

				{/* Analytics Tab */}
				<TabsContent className="space-y-6" value="analytics">
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<Card className="p-6">
							<h3 className="mb-4 font-semibold text-lg">Performance Trends</h3>
							<div className="flex h-64 items-center justify-center text-muted-foreground">
								Performance chart will be rendered here
							</div>
						</Card>

						<Card className="p-6">
							<h3 className="mb-4 font-semibold text-lg">Error Analysis</h3>
							<div className="flex h-64 items-center justify-center text-muted-foreground">
								Error analysis chart will be rendered here
							</div>
						</Card>

						<Card className="p-6">
							<h3 className="mb-4 font-semibold text-lg">Resource Usage</h3>
							<div className="flex h-64 items-center justify-center text-muted-foreground">
								Resource usage chart will be rendered here
							</div>
						</Card>

						<Card className="p-6">
							<h3 className="mb-4 font-semibold text-lg">Agent Activity</h3>
							<div className="flex h-64 items-center justify-center text-muted-foreground">
								Agent activity chart will be rendered here
							</div>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
