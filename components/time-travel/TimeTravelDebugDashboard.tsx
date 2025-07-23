/**
 * Time-Travel Debug Dashboard
 *
 * Main dashboard component that integrates all time-travel debugging features
 * including timeline visualization, replay controls, execution comparison, and rollback.
 */

"use client";

import { Download, GitCompare, History, Play, RotateCcw, Settings, Upload } from "lucide-react";
import React, { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTimeTravelDebug } from "@/hooks/use-time-travel-debug";
import { cn } from "@/lib/utils";
import { ExecutionComparison } from "./ExecutionComparison";
import { ReplayControls } from "./ReplayControls";
import { RollbackInterface } from "./RollbackInterface";
import { TimelineVisualization } from "./TimelineVisualization";

interface TimeTravelDebugDashboardProps {
	executionId: string;
	className?: string;
}

export function TimeTravelDebugDashboard({
	executionId,
	className,
}: TimeTravelDebugDashboardProps) {
	const [activeTab, setActiveTab] = useState("timeline");
	const [comparisonExecutionId, setComparisonExecutionId] = useState("");

	const {
		snapshots,
		timeline,
		rollbackPoints,
		replay,
		comparison,
		rollback,
		autoSnapshot,
		isLoading,
		isRollingBack,
		error,
	} = useTimeTravelDebug(executionId);

	// Handle replay controls
	const handleStartReplay = () => {
		replay.startSession();
		setActiveTab("replay");
	};

	const handleStopReplay = () => {
		replay.stopSession();
	};

	const handleTimelineStepClick = (stepNumber: number) => {
		if (replay.sessionId) {
			replay.jumpToStep(stepNumber);
		} else {
			handleStartReplay();
			// Jump to step after session is created
			setTimeout(() => replay.jumpToStep(stepNumber), 100);
		}
	};

	// Handle comparison
	const handleCompareExecutions = () => {
		if (comparisonExecutionId) {
			comparison.mutate({
				executionIdA: executionId,
				executionIdB: comparisonExecutionId,
			});
			setActiveTab("comparison");
		}
	};

	// Handle rollback
	const handleRollback = (checkpointId: string, reason: string) => {
		rollback(executionId, checkpointId, reason);
	};

	// Export timeline data
	const handleExportTimeline = () => {
		if (timeline) {
			const data = {
				executionId,
				timeline,
				snapshots,
				exportedAt: new Date().toISOString(),
			};

			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});

			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `execution-timeline-${executionId.slice(-8)}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}
	};

	if (error) {
		return (
			<div className={cn("p-6", className)}>
				<Alert variant="destructive">
					<AlertDescription>
						Failed to load time-travel debugging data: {error.message}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className={cn("space-y-6", className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold flex items-center">
						<History className="w-6 h-6 mr-3" />
						Time-Travel Debugging
					</h2>
					<p className="text-gray-600 mt-1">Debug and analyze execution: {executionId.slice(-8)}</p>
				</div>

				<div className="flex items-center space-x-2">
					<Button variant="outline" size="sm" onClick={handleExportTimeline} disabled={!timeline}>
						<Download className="w-4 h-4 mr-2" />
						Export
					</Button>

					{replay.sessionId ? (
						<Button variant="outline" onClick={handleStopReplay}>
							Stop Replay
						</Button>
					) : (
						<Button onClick={handleStartReplay} disabled={isLoading}>
							<Play className="w-4 h-4 mr-2" />
							Start Replay
						</Button>
					)}
				</div>
			</div>

			{/* Quick stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Total Steps</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{snapshots?.length || 0}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Checkpoints</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{rollbackPoints?.length || 0}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Timeline Events</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{timeline?.length || 0}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Replay Status</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-sm font-medium">
							{replay.sessionId ? (
								<span className="text-green-600">Active</span>
							) : (
								<span className="text-gray-500">Inactive</span>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Main content */}
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="timeline">Timeline</TabsTrigger>
					<TabsTrigger value="replay">Replay</TabsTrigger>
					<TabsTrigger value="comparison">Compare</TabsTrigger>
					<TabsTrigger value="rollback">Rollback</TabsTrigger>
				</TabsList>

				<TabsContent value="timeline" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Execution Timeline</CardTitle>
							<CardDescription>Visual timeline of execution steps and events</CardDescription>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<div className="flex items-center justify-center p-8">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
								</div>
							) : timeline ? (
								<TimelineVisualization
									timeline={timeline}
									currentStep={replay.session?.currentStep}
									onStepClick={handleTimelineStepClick}
								/>
							) : (
								<div className="text-center p-8 text-gray-500">
									<History className="mx-auto h-12 w-12 mb-4 opacity-50" />
									<p>No timeline data available</p>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="replay" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Step-by-Step Replay</CardTitle>
							<CardDescription>
								Control playback and examine execution state at each step
							</CardDescription>
						</CardHeader>
						<CardContent>
							{replay.sessionId ? (
								<div className="space-y-6">
									<ReplayControls
										session={replay.session}
										onPlay={() => replay.setPlaying(true)}
										onPause={() => replay.setPlaying(false)}
										onStop={handleStopReplay}
										onStepForward={replay.stepForward}
										onStepBackward={replay.stepBackward}
										onJumpToStep={replay.jumpToStep}
										onSpeedChange={replay.setPlaybackSpeed}
									/>

									{/* Current state display */}
									{replay.currentState && (
										<div className="mt-6">
											<h4 className="font-medium mb-3">Current State</h4>
											<pre className="p-4 bg-gray-50 rounded-lg text-sm overflow-x-auto">
												{JSON.stringify(replay.currentState, null, 2)}
											</pre>
										</div>
									)}
								</div>
							) : (
								<div className="text-center p-8 text-gray-500">
									<Play className="mx-auto h-12 w-12 mb-4 opacity-50" />
									<p className="text-lg font-medium mb-2">No active replay session</p>
									<p className="text-sm mb-4">
										Start a replay session to step through the execution
									</p>
									<Button onClick={handleStartReplay} disabled={isLoading}>
										<Play className="w-4 h-4 mr-2" />
										Start Replay Session
									</Button>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="comparison" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Execution Comparison</CardTitle>
							<CardDescription>
								Compare this execution with another to identify differences
							</CardDescription>
						</CardHeader>
						<CardContent>
							{comparison.data ? (
								<ExecutionComparison
									comparison={comparison.data}
									onViewExecution={(id) => {
										// Handle viewing execution details
										console.log("View execution:", id);
									}}
								/>
							) : (
								<div className="space-y-4">
									<div className="flex items-center space-x-4">
										<div className="flex-1">
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Compare with execution ID:
											</label>
											<input
												type="text"
												value={comparisonExecutionId}
												onChange={(e) => setComparisonExecutionId(e.target.value)}
												placeholder="Enter execution ID to compare..."
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
										</div>
										<Button
											onClick={handleCompareExecutions}
											disabled={!comparisonExecutionId || comparison.isPending}
										>
											{comparison.isPending ? (
												<>
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
													Comparing...
												</>
											) : (
												<>
													<GitCompare className="w-4 h-4 mr-2" />
													Compare
												</>
											)}
										</Button>
									</div>

									{comparison.error && (
										<Alert variant="destructive">
											<AlertDescription>{comparison.error.message}</AlertDescription>
										</Alert>
									)}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="rollback" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Rollback to Checkpoint</CardTitle>
							<CardDescription>
								Restore execution state to a previous consistent checkpoint
							</CardDescription>
						</CardHeader>
						<CardContent>
							<RollbackInterface
								rollbackPoints={rollbackPoints || []}
								onRollback={handleRollback}
								isRollingBack={isRollingBack}
							/>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
