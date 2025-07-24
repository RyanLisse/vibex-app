/**
 * Workflow Execution Details Component
 */

"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
	AlertTriangle,
	CheckCircle,
	ChevronRight,
	Clock,
	History,
	Loader2,
	Pause,
	Play,
	RotateCcw,
	Square,
	XCircle,
} from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
	useControlExecution,
	useRollbackExecution,
	useWorkflowExecution,
	useWorkflowProgress,
} from "@/hooks/use-workflow-queries";

interface WorkflowExecutionDetailsProps {
	executionId: string;
	className?: string;
}

export function WorkflowExecutionDetails({
	executionId,
	className,
}: WorkflowExecutionDetailsProps) {
	const { data: execution, isLoading } = useWorkflowExecution(executionId);
	const { data: progress } = useWorkflowProgress(executionId);
	const controlExecution = useControlExecution();
	const rollbackExecution = useRollbackExecution();

	const handleControlExecution = async (action: "pause" | "resume" | "cancel") => {
		try {
			await controlExecution.mutateAsync({ id: executionId, action });
			toast.success(`Execution ${action}d successfully`);
		} catch (error) {
			toast.error(`Failed to ${action} execution`);
			console.error(`Failed to ${action} execution:`, error);
		}
	};

	const handleRollback = async (checkpointIndex: number) => {
		try {
			await rollbackExecution.mutateAsync({ executionId, checkpointIndex });
			toast.success("Execution rolled back successfully");
		} catch (error) {
			toast.error("Failed to rollback execution");
			console.error("Failed to rollback execution:", error);
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "running":
				return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
			case "completed":
				return <CheckCircle className="h-5 w-5 text-green-500" />;
			case "failed":
				return <XCircle className="h-5 w-5 text-red-500" />;
			case "paused":
				return <Pause className="h-5 w-5 text-yellow-500" />;
			case "cancelled":
				return <Square className="h-5 w-5 text-gray-500" />;
			default:
				return <Clock className="h-5 w-5 text-gray-400" />;
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

	const getStepStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case "failed":
				return <XCircle className="h-4 w-4 text-red-500" />;
			case "running":
				return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
			case "skipped":
				return <ChevronRight className="h-4 w-4 text-gray-400" />;
			default:
				return <Clock className="h-4 w-4 text-gray-400" />;
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin" />
				<span className="ml-2">Loading execution details...</span>
			</div>
		);
	}

	if (!execution) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center p-8">
					<div className="text-center">
						<AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<h3 className="text-lg font-medium">Execution not found</h3>
						<p className="text-muted-foreground">
							The requested workflow execution could not be found.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className={className}>
			<div className="space-y-6">
				{/* Header */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-3">
								{getStatusIcon(execution.status)}
								<div>
									<CardTitle>Execution {execution.id.slice(0, 8)}</CardTitle>
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
						{/* Progress */}
						{progress && (
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">Progress</span>
									<span className="text-sm text-muted-foreground">{progress.progress}%</span>
								</div>
								<Progress value={progress.progress} className="h-2" />
								<div className="flex items-center justify-between text-xs text-muted-foreground">
									<span>
										Step {progress.currentStep + 1} of {progress.totalSteps}
									</span>
									{progress.currentStepName && <span>Current: {progress.currentStepName}</span>}
								</div>
							</div>
						)}

						{/* Error */}
						{execution.error && (
							<div className="p-4 bg-red-50 border border-red-200 rounded-md">
								<div className="flex items-center space-x-2 mb-2">
									<XCircle className="h-4 w-4 text-red-500" />
									<span className="font-medium text-red-800">Execution Error</span>
								</div>
								<p className="text-sm text-red-700">{execution.error}</p>
							</div>
						)}

						{/* Controls */}
						<div className="flex items-center space-x-2">
							{execution.status === "running" && (
								<>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleControlExecution("pause")}
										disabled={controlExecution.isPending}
									>
										<Pause className="h-4 w-4 mr-1" />
										Pause
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleControlExecution("cancel")}
										disabled={controlExecution.isPending}
									>
										<Square className="h-4 w-4 mr-1" />
										Cancel
									</Button>
								</>
							)}
							{execution.status === "paused" && (
								<>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleControlExecution("resume")}
										disabled={controlExecution.isPending}
									>
										<Play className="h-4 w-4 mr-1" />
										Resume
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleControlExecution("cancel")}
										disabled={controlExecution.isPending}
									>
										<Square className="h-4 w-4 mr-1" />
										Cancel
									</Button>
								</>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Execution Details */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Timeline */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Execution Timeline</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span className="font-medium">Started</span>
									<span>{format(new Date(execution.startedAt), "PPp")}</span>
								</div>
								{execution.completedAt && (
									<div className="flex items-center justify-between text-sm">
										<span className="font-medium">Completed</span>
										<span>{format(new Date(execution.completedAt), "PPp")}</span>
									</div>
								)}
								<div className="flex items-center justify-between text-sm">
									<span className="font-medium">Duration</span>
									<span>
										{execution.completedAt
											? formatDistanceToNow(new Date(execution.startedAt), {
													includeSeconds: true,
												})
											: formatDistanceToNow(new Date(execution.startedAt), {
													includeSeconds: true,
												}) + " (ongoing)"}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Metadata */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Execution Metadata</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span className="font-medium">Workflow ID</span>
									<span className="font-mono text-xs">{execution.workflowId}</span>
								</div>
								<div className="flex items-center justify-between text-sm">
									<span className="font-medium">Execution ID</span>
									<span className="font-mono text-xs">{execution.id}</span>
								</div>
								{execution.parentExecutionId && (
									<div className="flex items-center justify-between text-sm">
										<span className="font-medium">Parent Execution</span>
										<span className="font-mono text-xs">{execution.parentExecutionId}</span>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Steps */}
				{execution.state && (
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Step Details</CardTitle>
							<CardDescription>
								Current step: {execution.currentStep + 1} of {execution.totalSteps || "unknown"}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{Object.entries(execution.state.stepStates || {}).map(
									([stepId, stepState], index) => (
										<div key={stepId} className="flex items-center space-x-3 p-3 border rounded-lg">
											{getStepStatusIcon(stepState.status)}
											<div className="flex-1">
												<div className="flex items-center justify-between">
													<span className="font-medium">{stepId}</span>
													<Badge variant="outline" className="text-xs">
														{stepState.status}
													</Badge>
												</div>
												{stepState.error && (
													<p className="text-sm text-red-600 mt-1">{stepState.error}</p>
												)}
												{stepState.startedAt && (
													<p className="text-xs text-muted-foreground mt-1">
														Started: {format(new Date(stepState.startedAt), "PPp")}
													</p>
												)}
											</div>
										</div>
									)
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Checkpoints */}
				{execution.state?.checkpoints && execution.state.checkpoints.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="text-lg flex items-center">
								<History className="h-5 w-5 mr-2" />
								Checkpoints
							</CardTitle>
							<CardDescription>Available rollback points for this execution</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{execution.state.checkpoints.map((checkpoint, index) => (
									<div
										key={index}
										className="flex items-center justify-between p-3 border rounded-lg"
									>
										<div>
											<div className="font-medium">Step {checkpoint.stepNumber}</div>
											<div className="text-sm text-muted-foreground">
												{format(new Date(checkpoint.timestamp), "PPp")}
											</div>
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleRollback(index)}
											disabled={rollbackExecution.isPending || execution.status === "running"}
										>
											<RotateCcw className="h-4 w-4 mr-1" />
											Rollback
										</Button>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
