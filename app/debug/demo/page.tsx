"use client";

import { Bug, Clock, Database, Layers, Play } from "lucide-react";
import { useState } from "react";
import { TimeTravelDebugDashboard } from "@/components/debug/time-travel-debug-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	useDebugSession,
	useUserDebugSessions,
} from "@/hooks/use-time-travel-debug";
import { debug } from "@/lib/debug";

// Mock user ID for demo
const DEMO_USER_ID = "demo-user-123";

// Mock execution data for demo
const MOCK_EXECUTIONS = [
	{
		id: "exec-1",
		agentType: "search-agent",
		taskId: "task-1",
		status: "completed",
		startedAt: new Date(Date.now() - 3_600_000),
		completedAt: new Date(Date.now() - 3_000_000),
		error: null,
		metadata: {
			query: "Find documentation about React hooks",
			resultsFound: 15,
		},
	},
	{
		id: "exec-2",
		agentType: "code-analysis-agent",
		taskId: "task-2",
		status: "failed",
		startedAt: new Date(Date.now() - 7_200_000),
		completedAt: new Date(Date.now() - 6_600_000),
		error: "Failed to analyze complex type definitions",
		metadata: {
			filesAnalyzed: 23,
			linesProcessed: 1547,
		},
	},
	{
		id: "exec-3",
		agentType: "optimization-agent",
		taskId: "task-3",
		status: "completed",
		startedAt: new Date(Date.now() - 1_800_000),
		completedAt: new Date(Date.now() - 1_200_000),
		error: null,
		metadata: {
			optimizationsApplied: 7,
			performanceGain: "23%",
		},
	},
];

export default function DebugDemoPage() {
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
		null,
	);
	const [isCreatingSession, setIsCreatingSession] = useState(false);
	const { sessions, refetch: refetchSessions } =
		useUserDebugSessions(DEMO_USER_ID);

	const handleCreateSession = async (executionId: string) => {
		setIsCreatingSession(true);
		try {
			const session = await debug.startDebugSession(executionId, DEMO_USER_ID);
			setSelectedSessionId(session.id);
			refetchSessions();
		} catch (error) {
			console.error("Failed to create debug session:", error);
		} finally {
			setIsCreatingSession(false);
		}
	};

	if (selectedSessionId) {
		return (
			<div className="container mx-auto p-6">
				<div className="mb-6">
					<Button onClick={() => setSelectedSessionId(null)} variant="outline">
						← Back to Sessions
					</Button>
				</div>
				<TimeTravelDebugDashboard sessionId={selectedSessionId} />
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6">
			<div className="mb-8">
				<h1 className="mb-2 font-bold text-3xl">Time-Travel Debugging Demo</h1>
				<p className="text-muted-foreground">
					Debug agent executions with step-by-step replay and state inspection
				</p>
			</div>

			{/* Features overview */}
			<div className="mb-8 grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<Clock className="h-4 w-4" />
							Time Travel
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							Step through execution history forwards and backwards
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<Layers className="h-4 w-4" />
							State Inspection
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							Inspect agent state at any point in the execution
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<Database className="h-4 w-4" />
							Snapshot Storage
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							Automatic state snapshots stored in the database
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<Bug className="h-4 w-4" />
							Error Analysis
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							Identify and analyze errors in agent executions
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Active sessions */}
			{sessions.length > 0 && (
				<Card className="mb-8">
					<CardHeader>
						<CardTitle>Active Debug Sessions</CardTitle>
						<CardDescription>
							Continue debugging from your existing sessions
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{sessions.map((session) => (
								<div
									className="flex cursor-pointer items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
									key={session.id}
									onClick={() => setSelectedSessionId(session.id)}
								>
									<div>
										<div className="font-medium">
											{session.metadata.agentType}
										</div>
										<div className="text-muted-foreground text-sm">
											Started{" "}
											{new Date(session.metadata.startedAt).toLocaleString()}
										</div>
									</div>
									<div className="flex items-center gap-4">
										<Badge
											variant={
												session.status === "active" ? "default" : "secondary"
											}
										>
											{session.status}
										</Badge>
										<Play className="h-4 w-4" />
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Mock executions */}
			<Card>
				<CardHeader>
					<CardTitle>Recent Agent Executions</CardTitle>
					<CardDescription>
						Select an execution to start a new debug session
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{MOCK_EXECUTIONS.map((execution) => (
							<div
								className="flex items-center justify-between rounded-lg border p-4"
								key={execution.id}
							>
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<span className="font-medium">{execution.agentType}</span>
										<Badge
											variant={
												execution.status === "completed"
													? "default"
													: execution.status === "failed"
														? "destructive"
														: "secondary"
											}
										>
											{execution.status}
										</Badge>
									</div>
									<div className="mt-1 text-muted-foreground text-sm">
										{new Date(execution.startedAt).toLocaleString()} -
										{execution.completedAt &&
											new Date(execution.completedAt).toLocaleString()}
									</div>
									{execution.error && (
										<div className="mt-1 text-red-600 text-sm">
											{execution.error}
										</div>
									)}
									<div className="mt-2 flex gap-4 text-muted-foreground text-xs">
										{Object.entries(execution.metadata).map(([key, value]) => (
											<span key={key}>
												{key}: <strong>{value}</strong>
											</span>
										))}
									</div>
								</div>
								<Button
									disabled={isCreatingSession}
									onClick={() => handleCreateSession(execution.id)}
								>
									<Bug className="mr-2 h-4 w-4" />
									Debug
								</Button>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Instructions */}
			<Card className="mt-8">
				<CardHeader>
					<CardTitle>How to Use Time-Travel Debugging</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<h4 className="mb-2 font-medium">1. Select an Execution</h4>
						<p className="text-muted-foreground text-sm">
							Choose an agent execution from the list above to start debugging.
							The system will load all execution snapshots.
						</p>
					</div>
					<div>
						<h4 className="mb-2 font-medium">2. Navigate the Timeline</h4>
						<p className="text-muted-foreground text-sm">
							Use the timeline controls to step through the execution. You can
							play, pause, step forward/backward, or jump to specific steps.
						</p>
					</div>
					<div>
						<h4 className="mb-2 font-medium">3. Inspect State</h4>
						<p className="text-muted-foreground text-sm">
							View the complete agent state at each step, including memory,
							context, outputs, and performance metrics.
						</p>
					</div>
					<div>
						<h4 className="mb-2 font-medium">4. Set Breakpoints</h4>
						<p className="text-muted-foreground text-sm">
							Click on any step in the timeline to set a breakpoint. The
							debugger will pause when it reaches that step.
						</p>
					</div>
					<div>
						<h4 className="mb-2 font-medium">5. Compare States</h4>
						<p className="text-muted-foreground text-sm">
							Compare the state between different steps to understand how the
							execution evolved and identify issues.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
