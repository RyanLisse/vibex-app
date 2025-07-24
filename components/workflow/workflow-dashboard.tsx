/**
 * Workflow Dashboard Component
 *
 * Provides a comprehensive dashboard for managing workflows and executions
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import {
	AlertCircle,
	CheckCircle,
	Clock,
	Loader2,
	Pause,
	Play,
	RotateCcw,
	Square,
	XCircle,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	useControlExecution,
	useWorkflowExecutions,
	useWorkflowProgress,
	useWorkflows,
} from "@/hooks/use-workflow-queries";

interface WorkflowDashboardProps {
	className?: string;
}

export function WorkflowDashboard({ className }: WorkflowDashboardProps) {
	const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

	const { data: workflows, isLoading: workflowsLoading } = useWorkflows();
	const { data: executions, isLoading: executionsLoading } = useWorkflowExecutions({
		workflowId: selectedWorkflowId || undefined,
		limit: 20,
	});

	const controlExecution = useControlExecution();

	const handleControlExecution = async (
		executionId: string,
		action: "pause" | "resume" | "cancel"
	) => {
		try {
			await controlExecution.mutateAsync({ id: executionId, action });
		} catch (error) {
			console.error(`Failed to ${action} execution:`, error);
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "running":
				return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
			case "completed":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case "failed":
				return <XCircle className="h-4 w-4 text-red-500" />;
			case "paused":
				return <Pause className="h-4 w-4 text-yellow-500" />;
			case "cancelled":
				return <Square className="h-4 w-4 text-gray-500" />;
			default:
				return <Clock className="h-4 w-4 text-gray-400" />;
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "running":
				return "bg-blue-100 text-blue-800";
			case "completed":
				return "bg-green-100 text-green-800";
			case "failed":
				return "bg-red-100 text-red-800";
			case "paused":
				return "bg-yellow-100 text-yellow-800";
			case "cancelled":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-gray-100 text-gray-600";
		}
	};

	if (workflowsLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin" />
				<span className="ml-2">Loading workflows...</span>
			</div>
		);
	}

	return (
		<div className={className}>
			<div className="space-y-6">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Workflow Dashboard</h2>
					<p className="text-muted-foreground">Manage and monitor your workflow executions</p>
				</div>

				<Tabs defaultValue="executions" className="space-y-4">
					<TabsList>
						<TabsTrigger value="executions">Executions</TabsTrigger>
						<TabsTrigger value="workflows">Workflows</TabsTrigger>
					</TabsList>

					<TabsContent value="executions" className="space-y-4">
						<div className="grid gap-4">
							{executionsLoading ? (
								<div className="flex items-center justify-center p-8">
									<Loader2 className="h-6 w-6 animate-spin" />
									<span className="ml-2">Loading executions...</span>
								</div>
							) : executions && executions.length > 0 ? (
								executions.map((execution) => (
									<ExecutionCard
										key={execution.id}
										execution={execution}
										onControl={handleControlExecution}
										getStatusIcon={getStatusIcon}
										getStatusColor={getStatusColor}
									/>
								))
							) : (
								<Card>
									<CardContent className="flex items-center justify-center p-8">
										<div className="text-center">
											<AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
											<h3 className="text-lg font-medium">No executions found</h3>
											<p className="text-muted-foreground">
												{selectedWorkflowId
													? "No executions for the selected workflow"
													: "No workflow executions have been started yet"}
											</p>
										</div>
									</CardContent>
								</Card>
							)}
						</div>
					</TabsContent>

					<TabsContent value="workflows" className="space-y-4">
						<div className="grid gap-4">
							{workflows && workflows.length > 0 ? (
								workflows.map((workflow) => (
									<Card
										key={workflow.id}
										className="cursor-pointer hover:shadow-md transition-shadow"
									>
										<CardHeader>
											<div className="flex items-center justify-between">
												<div>
													<CardTitle className="text-lg">{workflow.name}</CardTitle>
													{workflow.description && (
														<CardDescription>{workflow.description}</CardDescription>
													)}
												</div>
												<Badge variant={workflow.isActive ? "default" : "secondary"}>
													{workflow.isActive ? "Active" : "Inactive"}
												</Badge>
											</div>
										</CardHeader>
										<CardContent>
											<div className="flex items-center justify-between">
												<div className="text-sm text-muted-foreground">
													Version {workflow.version} • Created{" "}
													{formatDistanceToNow(new Date(workflow.createdAt))} ago
												</div>
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														setSelectedWorkflowId(
															selectedWorkflowId === workflow.id ? null : workflow.id
														)
													}
												>
													{selectedWorkflowId === workflow.id ? "Deselect" : "View Executions"}
												</Button>
											</div>
										</CardContent>
									</Card>
								))
							) : (
								<Card>
									<CardContent className="flex items-center justify-center p-8">
										<div className="text-center">
											<AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
											<h3 className="text-lg font-medium">No workflows found</h3>
											<p className="text-muted-foreground">
												Create your first workflow to get started
											</p>
										</div>
									</CardContent>
								</Card>
							)}
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}

interface ExecutionCardProps {
	execution: any;
	onControl: (executionId: string, action: "pause" | "resume" | "cancel") => void;
	getStatusIcon: (status: string) => React.ReactNode;
	getStatusColor: (status: string) => string;
}

function ExecutionCard({
	execution,
	onControl,
	getStatusIcon,
	getStatusColor,
}: ExecutionCardProps) {
	const { data: progress } = useWorkflowProgress(execution.id);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						{getStatusIcon(execution.status)}
						<div>
							<CardTitle className="text-base">Execution {execution.id.slice(0, 8)}</CardTitle>
							<CardDescription>
								Started {formatDistanceToNow(new Date(execution.startedAt))} ago
								{execution.triggeredBy && ` by ${execution.triggeredBy}`}
							</CardDescription>
						</div>
					</div>
					<Badge className={getStatusColor(execution.status)}>{execution.status}</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{progress && (
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span>Progress</span>
							<span>{progress.progress}%</span>
						</div>
						<Progress value={progress.progress} className="h-2" />
						<div className="flex items-center justify-between text-xs text-muted-foreground">
							<span>
								Step {progress.currentStep + 1} of {progress.totalSteps}
							</span>
							{progress.currentStepName && <span>{progress.currentStepName}</span>}
						</div>
					</div>
				)}

				{execution.error && (
					<div className="p-3 bg-red-50 border border-red-200 rounded-md">
						<div className="flex items-center space-x-2">
							<XCircle className="h-4 w-4 text-red-500" />
							<span className="text-sm font-medium text-red-800">Error</span>
						</div>
						<p className="text-sm text-red-700 mt-1">{execution.error}</p>
					</div>
				)}

				<div className="flex items-center space-x-2">
					{execution.status === "running" && (
						<>
							<Button variant="outline" size="sm" onClick={() => onControl(execution.id, "pause")}>
								<Pause className="h-4 w-4 mr-1" />
								Pause
							</Button>
							<Button variant="outline" size="sm" onClick={() => onControl(execution.id, "cancel")}>
								<Square className="h-4 w-4 mr-1" />
								Cancel
							</Button>
						</>
					)}
					{execution.status === "paused" && (
						<>
							<Button variant="outline" size="sm" onClick={() => onControl(execution.id, "resume")}>
								<Play className="h-4 w-4 mr-1" />
								Resume
							</Button>
							<Button variant="outline" size="sm" onClick={() => onControl(execution.id, "cancel")}>
								<Square className="h-4 w-4 mr-1" />
								Cancel
							</Button>
						</>
					)}
					{(execution.status === "failed" || execution.status === "cancelled") && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								// This would trigger a restart - implement as needed
								console.log("Restart execution:", execution.id);
							}}
						>
							<RotateCcw className="h-4 w-4 mr-1" />
							Restart
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
