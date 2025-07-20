"use client";

	Activity,
	AlertCircle,
	Bug,
	Clock,
	Download,
	FileText,
	Layers,
	Play,
	Plus,
	RefreshCw,
	Search,
	Settings,
	Terminal,
	X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
	useBreakpoints,
	useDebugExport,
	useDebugNotes,
	useDebugSession,
	useSnapshotComparison,
	useTimeTravelReplay,
	useWatchedVariables,
} from "@/hooks/use-time-travel-debug";
import { cn } from "@/lib/utils";
import { ExecutionTimeline } from "./execution-timeline";
import { StateDiffViewer } from "./state-diff-viewer";
import { StateReplayViewer } from "./state-replay-viewer";

interface TimeTravelDebugDashboardProps {
	sessionId: string;
	className?: string;
}

// Session info card
function SessionInfoCard({ session }: { session: any }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<Terminal className="h-4 w-4" />
					Session Information
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2 text-sm">
				<div className="flex justify-between">
					<span className="text-muted-foreground">Execution ID:</span>
					<span className="font-mono text-xs">
						{session.metadata.executionId.slice(0, 8)}...
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Agent Type:</span>
					<Badge variant="outline">{session.metadata.agentType}</Badge>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Status:</span>
					<Badge
						variant={
							session.status === "active"
								? "default"
								: session.status === "paused"
									? "secondary"
									: "outline"
						}
					>
						{session.status}
					</Badge>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Total Steps:</span>
					<span>{session.totalSteps}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Checkpoints:</span>
					<span>{session.checkpoints.length}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Errors:</span>
					<span className={cn(session.issues.length > 0 && "text-red-600")}>
						{session.issues.length}
					</span>
				</div>
			</CardContent>
		</Card>
	);
}

// Performance metrics card
function PerformanceMetricsCard({ session }: { session: any }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<Activity className="h-4 w-4" />
					Performance Metrics
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2 text-sm">
				<div className="flex justify-between">
					<span className="text-muted-foreground">Snapshot Load Time:</span>
					<span>{session.performance.snapshotLoadTime}ms</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Total Replay Time:</span>
					<span>
						{(session.performance.totalReplayTime / 1000).toFixed(2)}s
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Average Step Time:</span>
					<span>{session.performance.averageStepTime.toFixed(2)}ms</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Session Duration:</span>
					<span>
						{session.metadata.endedAt
							? Math.round(
									(new Date(session.metadata.endedAt).getTime() -
										new Date(session.metadata.startedAt).getTime()) /
										1000,
								) + "s"
							: "Active"}
					</span>
				</div>
			</CardContent>
		</Card>
	);
}

// Notes panel
function NotesPanel({
	notes,
	onAddNote,
}: {
	notes: string[];
	onAddNote: (note: string) => void;
}) {
	const [newNote, setNewNote] = useState("");
	const [isAddingNote, setIsAddingNote] = useState(false);

	const handleAddNote = () => {
		if (newNote.trim()) {
			onAddNote(newNote.trim());
			setNewNote("");
			setIsAddingNote(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-base">
						<FileText className="h-4 w-4" />
						Debug Notes
					</CardTitle>
					<Button
						onClick={() => setIsAddingNote(!isAddingNote)}
						size="icon"
						variant="ghost"
					>
						{isAddingNote ? (
							<X className="h-4 w-4" />
						) : (
							<Plus className="h-4 w-4" />
						)}
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{isAddingNote && (
					<div className="mb-4 space-y-2">
						<Textarea
							className="min-h-[80px]"
							onChange={(e) => setNewNote(e.target.value)}
							placeholder="Add a debug note..."
							value={newNote}
						/>
						<div className="flex justify-end gap-2">
							<Button
								onClick={() => {
									setNewNote("");
									setIsAddingNote(false);
								}}
								size="sm"
								variant="outline"
							>
								Cancel
							</Button>
							<Button onClick={handleAddNote} size="sm">
								Add Note
							</Button>
						</div>
					</div>
				)}
				<div className="space-y-2">
					{notes.length === 0 ? (
						<p className="text-muted-foreground text-sm">No notes yet</p>
					) : (
						notes.map((note, index) => (
							<div
								className="rounded-md border bg-muted/50 p-2 text-sm"
								key={index}
							>
								{note}
							</div>
						))
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// Comparison panel
function ComparisonPanel({
	currentSnapshot,
	snapshots,
	onCompare,
}: {
	currentSnapshot: any;
	snapshots: any[];
	onCompare: (left: any, right: any) => void;
}) {
	const [compareIndex, setCompareIndex] = useState<number>(-1);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<Layers className="h-4 w-4" />
					Snapshot Comparison
				</CardTitle>
				<CardDescription>
					Compare the current snapshot with another point in the execution
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label>Compare with step:</Label>
					<div className="flex gap-2">
						<Input
							className="flex-1"
							max={snapshots.length - 1}
							min={0}
							onChange={(e) =>
								setCompareIndex(Number.parseInt(e.target.value) || -1)
							}
							placeholder="Step number"
							type="number"
							value={compareIndex >= 0 ? compareIndex : ""}
						/>
						<Button
							disabled={compareIndex < 0 || compareIndex >= snapshots.length}
							onClick={() => {
								if (compareIndex >= 0 && compareIndex < snapshots.length) {
									onCompare(currentSnapshot, snapshots[compareIndex]);
								}
							}}
						>
							Compare
						</Button>
					</div>
				</div>
				<div className="text-muted-foreground text-xs">
					Current step: {currentSnapshot?.stepNumber || 0}
				</div>
			</CardContent>
		</Card>
	);
}

export function TimeTravelDebugDashboard({
	sessionId,
	className,
}: TimeTravelDebugDashboardProps) {
	const {
		session,
		isLoading: sessionLoading,
		closeSession,
	} = useDebugSession(sessionId);
	const {
		snapshots,
		currentSnapshot,
		currentIndex,
		totalSteps,
		isPlaying,
		playbackSpeed,
		stepTo,
		togglePlayback,
		stopPlayback,
		updateSpeed,
		continueToBreakpoint,
	} = useTimeTravelReplay(sessionId);
	const { breakpoints, toggleBreakpoint } = useBreakpoints(sessionId);
	const { watchedVariables, watchedValues, addWatch, removeWatch } =
		useWatchedVariables(sessionId);
	const { notes, addNote } = useDebugNotes(sessionId);
	const { exportSession, isExporting } = useDebugExport(sessionId);

	const [activeTab, setActiveTab] = useState("timeline");
	const [showComparison, setShowComparison] = useState(false);
	const [comparisonSnapshots, setComparisonSnapshots] = useState<{
		left: any;
		right: any;
	} | null>(null);

	const { comparison, isComparing } = useSnapshotComparison(
		comparisonSnapshots?.left,
		comparisonSnapshots?.right,
	);

	const handleCompare = (left: any, right: any) => {
		setComparisonSnapshots({ left, right });
		setShowComparison(true);
	};

	if (sessionLoading || !session) {
		return (
			<div
				className={cn("flex h-[600px] items-center justify-center", className)}
			>
				<div className="text-center">
					<Bug className="mx-auto mb-4 h-12 w-12 animate-pulse text-muted-foreground" />
					<p className="text-muted-foreground">Loading debug session...</p>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("space-y-6", className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="flex items-center gap-2 font-bold text-2xl">
						<Bug className="h-6 w-6" />
						Time-Travel Debugger
					</h2>
					<p className="text-muted-foreground">
						Debug agent execution step by step with time-travel capabilities
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						disabled={isExporting}
						onClick={exportSession}
						size="sm"
						variant="outline"
					>
						<Download className="mr-2 h-4 w-4" />
						Export Session
					</Button>
					<Button onClick={closeSession} size="sm" variant="outline">
						<X className="mr-2 h-4 w-4" />
						Close Session
					</Button>
				</div>
			</div>

			{/* Main content */}
			<div className="grid gap-6 lg:grid-cols-3">
				{/* Left sidebar */}
				<div className="space-y-4">
					<SessionInfoCard session={session} />
					<PerformanceMetricsCard session={session} />
					<NotesPanel notes={notes} onAddNote={addNote} />
				</div>

				{/* Main panel */}
				<div className="space-y-6 lg:col-span-2">
					{/* Timeline */}
					<ExecutionTimeline
						breakpoints={breakpoints}
						checkpoints={session.checkpoints}
						currentIndex={currentIndex}
						errors={session.issues.map((e) => e.stepNumber)}
						isPlaying={isPlaying}
						onBreakpointToggle={toggleBreakpoint}
						onPlayPause={togglePlayback}
						onSpeedChange={updateSpeed}
						onStepTo={stepTo}
						onStop={stopPlayback}
						playbackSpeed={playbackSpeed}
						sessionId={sessionId}
						snapshots={snapshots}
					/>

					{/* Tabs */}
					<Tabs onValueChange={setActiveTab} value={activeTab}>
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="state">State Viewer</TabsTrigger>
							<TabsTrigger value="errors">Errors & Issues</TabsTrigger>
							<TabsTrigger value="insights">Insights</TabsTrigger>
						</TabsList>

						<TabsContent className="space-y-4" value="state">
							<StateReplayViewer
								onAddWatch={addWatch}
								onRemoveWatch={removeWatch}
								snapshot={currentSnapshot}
								watchedVariables={watchedVariables}
							/>
							<ComparisonPanel
								currentSnapshot={currentSnapshot}
								onCompare={handleCompare}
								snapshots={snapshots}
							/>
						</TabsContent>

						<TabsContent className="space-y-4" value="errors">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<AlertCircle className="h-5 w-5" />
										Execution Errors
									</CardTitle>
									<CardDescription>
										Errors encountered during agent execution
									</CardDescription>
								</CardHeader>
								<CardContent>
									{session.issues.length === 0 ? (
										<p className="text-center text-muted-foreground">
											No errors detected
										</p>
									) : (
										<div className="space-y-3">
											{session.issues.map((error, index) => (
												<div
													className="rounded-lg border border-red-200 bg-red-50 p-3"
													key={index}
												>
													<div className="flex items-start justify-between">
														<div className="flex-1">
															<div className="flex items-center gap-2">
																<Badge variant="destructive">
																	Step {error.stepNumber}
																</Badge>
																<span className="text-muted-foreground text-xs">
																	{new Date(
																		error.timestamp,
																	).toLocaleTimeString()}
																</span>
															</div>
															<p className="mt-1 font-medium text-red-900">
																{error.error.message}
															</p>
															{error.error.stack && (
																<pre className="mt-2 overflow-x-auto text-red-800 text-xs">
																	{error.error.stack}
																</pre>
															)}
														</div>
														<Button
															onClick={() => stepTo(error.stepNumber)}
															size="sm"
															variant="ghost"
														>
															Go to Step
														</Button>
													</div>
												</div>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent className="space-y-4" value="insights">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Search className="h-5 w-5" />
										Execution Insights
									</CardTitle>
									<CardDescription>
										AI-powered analysis of execution patterns and optimization
										opportunities
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="flex h-[200px] items-center justify-center text-muted-foreground">
										<div className="text-center">
											<RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin" />
											<p>Analyzing execution patterns...</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			</div>

			{/* Comparison Dialog */}
			{showComparison && comparison && (
				<Dialog onOpenChange={setShowComparison} open={showComparison}>
					<DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Snapshot Comparison</DialogTitle>
							<DialogDescription>
								Comparing step {comparisonSnapshots?.left?.stepNumber} with step{" "}
								{comparisonSnapshots?.right?.stepNumber}
							</DialogDescription>
						</DialogHeader>
						<StateDiffViewer comparison={comparison} />
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
