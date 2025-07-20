"use client";

import {
	AlertCircle,
	CheckCircle,
	Clock,
	GitBranch,
	Pause,
	Play,
	RefreshCw,
	SkipBack,
	SkipForward,
	Square,
	XCircle,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ExecutionSnapshot {
	id: string;
	executionId: string;
	stepIndex: number;
	timestamp: Date;
	state: Record<string, any>;
	metadata: Record<string, any>;
}

interface ReplaySession {
	id: string;
	executionId: string;
	status: "preparing" | "playing" | "paused" | "completed" | "error";
	currentStep: number;
	totalSteps: number;
	speed: number;
	startedAt: Date;
}

interface TimeTravelDebuggerProps {
	executionId: string;
	onClose?: () => void;
}

export function TimeTravelDebugger({
	executionId,
	onClose,
}: TimeTravelDebuggerProps) {
	const [snapshots, setSnapshots] = useState<ExecutionSnapshot[]>([]);
	const [currentSnapshot, setCurrentSnapshot] =
		useState<ExecutionSnapshot | null>(null);
	const [replaySession, setReplaySession] = useState<ReplaySession | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(true);
	const [selectedSnapshotIds, setSelectedSnapshotIds] = useState<string[]>([]);
	const [comparisonData, setComparisonData] = useState<any>(null);

	// Load snapshots for the execution
	useEffect(() => {
		const loadSnapshots = async () => {
			try {
				setIsLoading(true);
				const response = await fetch(
					`/api/time-travel/snapshots?executionId=${executionId}`,
				);
				const data = await response.json();
				setSnapshots(data.snapshots || []);
				if (data.snapshots?.length > 0) {
					setCurrentSnapshot(data.snapshots[0]);
				}
			} catch (error) {
				console.error("Failed to load snapshots:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadSnapshots();
	}, [executionId]);

	// Start replay session
	const startReplay = async (speed = 1) => {
		try {
			const response = await fetch("/api/time-travel/replay", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					executionId,
					speed,
					includeOutputs: true,
				}),
			});

			const session = await response.json();
			setReplaySession(session);
		} catch (error) {
			console.error("Failed to start replay:", error);
		}
	};

	// Compare selected snapshots
	const compareSnapshots = async () => {
		if (selectedSnapshotIds.length < 2) return;

		try {
			const response = await fetch("/api/time-travel/compare", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					snapshotIds: selectedSnapshotIds,
					includeStateDiff: true,
					includeMetadataDiff: true,
					diffFormat: "unified",
				}),
			});

			const comparison = await response.json();
			setComparisonData(comparison);
		} catch (error) {
			console.error("Failed to compare snapshots:", error);
		}
	};

	// Toggle snapshot selection for comparison
	const toggleSnapshotSelection = (snapshotId: string) => {
		setSelectedSnapshotIds((prev) => {
			if (prev.includes(snapshotId)) {
				return prev.filter((id) => id !== snapshotId);
			}
			if (prev.length < 5) {
				// Limit to 5 snapshots
				return [...prev, snapshotId];
			}
			return prev;
		});
	};

	if (isLoading) {
		return (
			<Card className="p-6">
				<div className="flex h-64 items-center justify-center">
					<RefreshCw className="h-8 w-8 animate-spin" />
					<span className="ml-2">Loading execution snapshots...</span>
				</div>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-4">
					<Clock className="h-6 w-6" />
					<h2 className="font-bold text-2xl">Time-Travel Debugger</h2>
					<Badge variant="outline">{snapshots.length} snapshots</Badge>
				</div>
				{onClose && (
					<Button onClick={onClose} variant="outline">
						Close
					</Button>
				)}
			</div>

			<Tabs className="space-y-4" defaultValue="timeline">
				<TabsList>
					<TabsTrigger value="timeline">Timeline</TabsTrigger>
					<TabsTrigger value="replay">Replay</TabsTrigger>
					<TabsTrigger value="compare">Compare</TabsTrigger>
					<TabsTrigger value="analysis">Analysis</TabsTrigger>
				</TabsList>

				{/* Timeline View */}
				<TabsContent className="space-y-4" value="timeline">
					<Card className="p-6">
						<div className="mb-4 flex items-center justify-between">
							<h3 className="font-semibold text-lg">Execution Timeline</h3>
							<div className="flex items-center space-x-2">
								<Button
									disabled={selectedSnapshotIds.length < 2}
									onClick={() => compareSnapshots()}
									size="sm"
									variant="outline"
								>
									Compare Selected ({selectedSnapshotIds.length})
								</Button>
							</div>
						</div>

						<ScrollArea className="h-96">
							<div className="space-y-2">
								{snapshots.map((snapshot, index) => (
									<div
										className={`cursor-pointer rounded-lg border p-4 transition-colors ${
											currentSnapshot?.id === snapshot.id
												? "border-primary bg-primary/10"
												: "hover:bg-muted/50"
										} ${selectedSnapshotIds.includes(snapshot.id) ? "ring-2 ring-blue-500" : ""}`}
										key={snapshot.id}
										onClick={() => setCurrentSnapshot(snapshot)}
										onDoubleClick={() => toggleSnapshotSelection(snapshot.id)}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-3">
												<div className="flex items-center space-x-2">
													<Badge variant="secondary">
														Step {snapshot.stepIndex}
													</Badge>
													<span className="text-muted-foreground text-sm">
														{new Date(snapshot.timestamp).toLocaleTimeString()}
													</span>
												</div>
											</div>
											<div className="flex items-center space-x-2">
												{selectedSnapshotIds.includes(snapshot.id) && (
													<CheckCircle className="h-4 w-4 text-blue-500" />
												)}
												<GitBranch className="h-4 w-4 text-muted-foreground" />
											</div>
										</div>
									</div>
								))}
							</div>
						</ScrollArea>
					</Card>

					{/* Current Snapshot Details */}
					{currentSnapshot && (
						<Card className="p-6">
							<h3 className="mb-4 font-semibold text-lg">Snapshot Details</h3>
							<div className="grid grid-cols-2 gap-6">
								<div>
									<h4 className="mb-2 font-medium">State</h4>
									<ScrollArea className="h-48 rounded border p-3">
										<pre className="text-sm">
											{JSON.stringify(currentSnapshot.state, null, 2)}
										</pre>
									</ScrollArea>
								</div>
								<div>
									<h4 className="mb-2 font-medium">Metadata</h4>
									<ScrollArea className="h-48 rounded border p-3">
										<pre className="text-sm">
											{JSON.stringify(currentSnapshot.metadata, null, 2)}
										</pre>
									</ScrollArea>
								</div>
							</div>
						</Card>
					)}
				</TabsContent>

				{/* Replay View */}
				<TabsContent className="space-y-4" value="replay">
					<Card className="p-6">
						<div className="mb-4 flex items-center justify-between">
							<h3 className="font-semibold text-lg">Execution Replay</h3>
							<div className="flex items-center space-x-2">
								<Button
									disabled={!!replaySession}
									onClick={() => startReplay(0.5)}
									size="sm"
									variant="outline"
								>
									<Play className="mr-1 h-4 w-4" />
									0.5x
								</Button>
								<Button
									disabled={!!replaySession}
									onClick={() => startReplay(1)}
									size="sm"
									variant="outline"
								>
									<Play className="mr-1 h-4 w-4" />
									1x
								</Button>
								<Button
									disabled={!!replaySession}
									onClick={() => startReplay(2)}
									size="sm"
									variant="outline"
								>
									<Play className="mr-1 h-4 w-4" />
									2x
								</Button>
							</div>
						</div>

						{replaySession ? (
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-4">
										<Badge variant="outline">{replaySession.status}</Badge>
										<span className="text-muted-foreground text-sm">
											Speed: {replaySession.speed}x
										</span>
									</div>
									<div className="flex items-center space-x-2">
										<Button size="sm" variant="outline">
											<SkipBack className="h-4 w-4" />
										</Button>
										<Button size="sm" variant="outline">
											{replaySession.status === "playing" ? (
												<Pause className="h-4 w-4" />
											) : (
												<Play className="h-4 w-4" />
											)}
										</Button>
										<Button size="sm" variant="outline">
											<SkipForward className="h-4 w-4" />
										</Button>
										<Button size="sm" variant="destructive">
											<Square className="h-4 w-4" />
										</Button>
									</div>
								</div>

								<Progress
									value={
										(replaySession.currentStep / replaySession.totalSteps) * 100
									}
								/>

								<div className="text-muted-foreground text-sm">
									Step {replaySession.currentStep} of {replaySession.totalSteps}
								</div>
							</div>
						) : (
							<div className="py-8 text-center text-muted-foreground">
								<Play className="mx-auto mb-2 h-12 w-12 opacity-50" />
								<p>Click a speed button to start replay</p>
							</div>
						)}
					</Card>
				</TabsContent>

				{/* Compare View */}
				<TabsContent className="space-y-4" value="compare">
					<Card className="p-6">
						<h3 className="mb-4 font-semibold text-lg">Snapshot Comparison</h3>

						{comparisonData ? (
							<div className="space-y-6">
								<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<Card className="p-4">
										<div className="mb-2 flex items-center space-x-2">
											<CheckCircle className="h-4 w-4 text-green-500" />
											<span className="font-medium">Additions</span>
										</div>
										<div className="font-bold text-2xl text-green-600">
											{comparisonData.comparisons?.reduce(
												(sum: number, comp: any) =>
													sum + (comp.diff?.state?.summary?.additions || 0),
												0,
											) || 0}
										</div>
									</Card>

									<Card className="p-4">
										<div className="mb-2 flex items-center space-x-2">
											<XCircle className="h-4 w-4 text-red-500" />
											<span className="font-medium">Deletions</span>
										</div>
										<div className="font-bold text-2xl text-red-600">
											{comparisonData.comparisons?.reduce(
												(sum: number, comp: any) =>
													sum + (comp.diff?.state?.summary?.deletions || 0),
												0,
											) || 0}
										</div>
									</Card>

									<Card className="p-4">
										<div className="mb-2 flex items-center space-x-2">
											<AlertCircle className="h-4 w-4 text-blue-500" />
											<span className="font-medium">Modifications</span>
										</div>
										<div className="font-bold text-2xl text-blue-600">
											{comparisonData.comparisons?.reduce(
												(sum: number, comp: any) =>
													sum + (comp.diff?.state?.summary?.modifications || 0),
												0,
											) || 0}
										</div>
									</Card>
								</div>

								<Separator />

								<ScrollArea className="h-64">
									{comparisonData.comparisons?.map(
										(comparison: any, index: number) => (
											<div className="mb-4 rounded border p-4" key={index}>
												<div className="mb-2 flex items-center justify-between">
													<span className="font-medium">
														Step {comparison.from.stepIndex} →{" "}
														{comparison.to.stepIndex}
													</span>
													<Badge variant="outline">
														{comparison.summary.stateChanges} changes
													</Badge>
												</div>

												{comparison.diff?.state?.changes
													?.slice(0, 3)
													.map((change: any, changeIndex: number) => (
														<div
															className="mb-1 rounded bg-muted p-2 text-sm"
															key={changeIndex}
														>
															<span
																className={`font-mono ${
																	change.type === "added"
																		? "text-green-600"
																		: change.type === "removed"
																			? "text-red-600"
																			: "text-blue-600"
																}`}
															>
																{change.type.toUpperCase()}
															</span>
															<span className="ml-2">{change.path}</span>
														</div>
													))}
											</div>
										),
									)}
								</ScrollArea>
							</div>
						) : (
							<div className="py-8 text-center text-muted-foreground">
								<GitBranch className="mx-auto mb-2 h-12 w-12 opacity-50" />
								<p>
									Select multiple snapshots in the Timeline tab to compare them
								</p>
							</div>
						)}
					</Card>
				</TabsContent>

				{/* Analysis View */}
				<TabsContent className="space-y-4" value="analysis">
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<Card className="p-6">
							<h3 className="mb-4 font-semibold text-lg">
								Performance Timeline
							</h3>
							<div className="h-64">
								<ResponsiveContainer height="100%" width="100%">
									<LineChart
										data={snapshots.map((snapshot, index) => ({
											step: snapshot.stepIndex,
											timestamp: new Date(snapshot.timestamp).getTime(),
											duration:
												index > 0
													? new Date(snapshot.timestamp).getTime() -
														new Date(snapshots[index - 1].timestamp).getTime()
													: 0,
										}))}
									>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="step" />
										<YAxis />
										<Tooltip />
										<Line
											dataKey="duration"
											stroke="#8884d8"
											strokeWidth={2}
											type="monotone"
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						</Card>

						<Card className="p-6">
							<h3 className="mb-4 font-semibold text-lg">Execution Summary</h3>
							<div className="space-y-4">
								<div className="flex justify-between">
									<span>Total Steps:</span>
									<span className="font-medium">{snapshots.length}</span>
								</div>
								<div className="flex justify-between">
									<span>Duration:</span>
									<span className="font-medium">
										{snapshots.length > 1
											? `${(
													(new Date(
														snapshots[snapshots.length - 1].timestamp,
													).getTime() -
														new Date(snapshots[0].timestamp).getTime()) /
														1000
												).toFixed(2)}s`
											: "N/A"}
									</span>
								</div>
								<div className="flex justify-between">
									<span>Average Step Time:</span>
									<span className="font-medium">
										{snapshots.length > 1
											? `${(
													(new Date(
														snapshots[snapshots.length - 1].timestamp,
													).getTime() -
														new Date(snapshots[0].timestamp).getTime()) /
														1000 /
														snapshots.length
												).toFixed(2)}s`
											: "N/A"}
									</span>
								</div>
								<Separator />
								<div className="space-y-2">
									<h4 className="font-medium">Recommendations</h4>
									<ul className="space-y-1 text-muted-foreground text-sm">
										<li>• Monitor steps with high duration variance</li>
										<li>
											• Consider adding checkpoints for long-running steps
										</li>
										<li>• Review error handling in failed executions</li>
									</ul>
								</div>
							</div>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
