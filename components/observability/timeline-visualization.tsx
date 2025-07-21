"use client";

/**
 * Timeline Visualization Component
 *
 * Interactive timeline for time-travel debugging with execution snapshots,
 * step-by-step replay, and diff visualization capabilities.
 */
import { Activity,
import { Zap
} from "lucide-react";
import type React from "react";
import { Progress } from "@/components/ui/progress";
	type ExecutionSnapshot,
	type ReplaySession,
	type ReplaySpeed,
	type ReplayState,
	type SnapshotType,
	timeTravel
} from "@/lib/time-travel";

interface TimelineVisualizationProps {
	executionId: string;
	onSnapshotSelected?: (snapshot: ExecutionSnapshot) => void;
	onStateChanged?: (state: any) => void;
	className?: string;
}

// Snapshot type to icon mapping
const SNAPSHOT_ICONS: Record<SnapshotType, React.ReactNode> = {
	execution_start: <Play className="h-4 w-4" />,
	step_start: <Activity className="h-3 w-3" />,
	step_end: <CheckCircle className="h-3 w-3" />,
	decision_point: <GitCommit className="h-4 w-4" />,
	error_state: <XCircle className="h-4 w-4" />,
	execution_end: <Stop className="h-4 w-4" />,
	checkpoint: <Clock className="h-4 w-4" />,
	rollback_point: <SkipBack className="h-4 w-4" />,
};

// Snapshot type to color mapping
const SNAPSHOT_COLORS: Record<SnapshotType, string> = {
	execution_start: "bg-green-500",
	step_start: "bg-blue-400",
	step_end: "bg-blue-600",
	decision_point: "bg-yellow-500",
	error_state: "bg-red-500",
	execution_end: "bg-gray-500",
	checkpoint: "bg-purple-500",
	rollback_point: "bg-orange-500",
};

export function TimelineVisualization({
	executionId,
	onSnapshotSelected,
	onStateChanged,
	className = "",
}: TimelineVisualizationProps) {
	const [snapshots, setSnapshots] = useState<ExecutionSnapshot[]>([]);
	const [replaySession, setReplaySession] = useState<ReplaySession | null>(
		null,
	);
	const [currentSnapshot, setCurrentSnapshot] =
		useState<ExecutionSnapshot | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [replayState, setReplayState] = useState<ReplayState>("idle");
	const [replaySpeed, setReplaySpeed] = useState<ReplaySpeed>(1);
	const [progress, setProgress] = useState(0);
	const [showDiff, setShowDiff] = useState(false);
	const [compareSnapshot, setCompareSnapshot] =
		useState<ExecutionSnapshot | null>(null);

	// Load snapshots for execution
	const loadSnapshots = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const executionSnapshots = await timeTravel.system.getExecutionSnapshots(
				executionId,
				{
					limit: 500,
					checkpointsOnly: false,
				},
			);

			setSnapshots(executionSnapshots);

			if (executionSnapshots.length > 0) {
				setCurrentSnapshot(executionSnapshots[0]);
				onSnapshotSelected?.(executionSnapshots[0]);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load snapshots");
			console.error("Failed to load snapshots:", err);
		} finally {
			setLoading(false);
		}
	}, [executionId, onSnapshotSelected]);

	// Initialize replay session
	const initializeReplaySession = useCallback(async () => {
		try {
			const sessionId = await timeTravel.startReplay(executionId);
			const session = timeTravel.replay.getSession(sessionId);
			setReplaySession(session);
			setReplayState(session?.state || "idle");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to initialize replay",
			);
			console.error("Failed to initialize replay session:", err);
		}
	}, [executionId]);

	// Control replay playback
	const controlReplay = useCallback(
		async (
			action: "start" | "pause" | "stop" | "step-forward" | "step-backward",
		) => {
			if (!replaySession) return;

			try {
				await timeTravel.controlReplay(replaySession.id, action);

				const updatedSession = timeTravel.replay.getSession(replaySession.id);
				if (updatedSession) {
					setReplaySession(updatedSession);
					setReplayState(updatedSession.state);

					const currentSnap =
						updatedSession.snapshots[updatedSession.currentIndex];
					if (currentSnap) {
						setCurrentSnapshot(currentSnap);
						onSnapshotSelected?.(currentSnap);
						onStateChanged?.(currentSnap.state);
					}

					setProgress(
						(updatedSession.currentIndex /
							(updatedSession.snapshots.length - 1)) *
							100,
					);
				}
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to control replay",
				);
				console.error("Failed to control replay:", err);
			}
		},
		[replaySession, onSnapshotSelected, onStateChanged],
	);

	// Jump to specific snapshot
	const jumpToSnapshot = useCallback(
		async (snapshot: ExecutionSnapshot) => {
			if (!replaySession) return;

			try {
				const index = replaySession.snapshots.findIndex(
					(s) => s.id === snapshot.id,
				);
				if (index === -1) return;

				await timeTravel.controlReplay(replaySession.id, "step-forward", {
					index,
				});

				const updatedSession = timeTravel.replay.getSession(replaySession.id);
				if (updatedSession) {
					setReplaySession(updatedSession);
					setCurrentSnapshot(snapshot);
					onSnapshotSelected?.(snapshot);
					onStateChanged?.(snapshot.state);
					setProgress((index / (updatedSession.snapshots.length - 1)) * 100);
				}
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to jump to snapshot",
				);
				console.error("Failed to jump to snapshot:", err);
			}
		},
		[replaySession, onSnapshotSelected, onStateChanged],
	);

	// Set replay speed
	const setSpeed = useCallback(
		async (speed: ReplaySpeed) => {
			if (!replaySession) return;

			try {
				await timeTravel.controlReplay(replaySession.id, "start", { speed });
				setReplaySpeed(speed);
			} catch (err) {
				console.error("Failed to set replay speed:", err);
			}
		},
		[replaySession],
	);

	// Calculate diff between snapshots
	const calculateDiff = useCallback(
		(snapshot1: ExecutionSnapshot, snapshot2: ExecutionSnapshot) => {
			return timeTravel.snapshots.compareSnapshots(snapshot1, snapshot2);
		},
		[],
	);

	// Load data on mount
	useEffect(() => {
		loadSnapshots();
		initializeReplaySession();
	}, [loadSnapshots, initializeReplaySession]);

	// Timeline statistics
	const timelineStats = useMemo(() => {
		const checkpoints = snapshots.filter((s) => s.metadata.isCheckpoint).length;
		const errors = snapshots.filter((s) => s.type === "error_state").length;
		const duration =
			snapshots.length > 1
				? snapshots[snapshots.length - 1].timestamp.getTime() -
					snapshots[0].timestamp.getTime()
				: 0;

		return { checkpoints, errors, duration, totalSteps: snapshots.length };
	}, [snapshots]);

	if (loading) {
		return (
			<Card className={className}>
				<CardContent className="p-6">
					<div className="flex items-center justify-center">
						<Activity className="mr-2 h-5 w-5 animate-spin" />Loading timeline...
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className={className}>
				<CardContent className="p-6">
					<div className="flex items-center text-red-600">
						<AlertTriangle className="mr-2 h-5 w-5" />
						{error}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className={`space-y-4 ${className}`}>
			{/* Timeline Controls */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center">
							<Clock className="mr-2 h-5 w-5" />Time-Travel Debug Timeline
						</CardTitle>
						<div className="flex items-center space-x-2">
							<Badge variant="outline">{timelineStats.totalSteps} steps</Badge>
							<Badge variant="outline">
								{timelineStats.checkpoints} checkpoints
							</Badge>
							{timelineStats.errors > 0 && (
								<Badge variant="destructive">
									{timelineStats.issues} errors
								</Badge>
							)}
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-4">
					{/* Playback Controls */}
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<Button
								disabled={!replaySession || replaySession.currentIndex === 0}
								onClick={() => controlReplay("step-backward")}
								size="sm"
								variant="outline"
							>
								<StepBack className="h-4 w-4" />
							</Button>

							<Button
								disabled={!replaySession}
								onClick={() =>
									controlReplay(replayState === "playing" ? "pause" : "start")
								}
								size="sm"
								variant="outline"
							>
								{replayState === "playing" ? (
									<Pause className="h-4 w-4" />
								) : (
									<Play className="h-4 w-4" />
								)}
							</Button>

							<Button
								disabled={!replaySession || replayState === "idle"}
								onClick={() => controlReplay("stop")}
								size="sm"
								variant="outline"
							>
								<Stop className="h-4 w-4" />
							</Button>

							<Button
								disabled={
									!replaySession ||
									replaySession.currentIndex ===
										replaySession.snapshots.length - 1
								}
								onClick={() => controlReplay("step-forward")}
								size="sm"
								variant="outline"
							>
								<StepForward className="h-4 w-4" />
							</Button>
						</div>

						{/* Speed Controls */}
						<div className="flex items-center space-x-2">
							<span className="text-gray-600 text-sm">Speed:</span>
							{([0.25, 0.5, 1, 2, 4] as ReplaySpeed[]).map((speed) => (
								<Button
									className="px-2"
									key={speed}
									onClick={() => setSpeed(speed)}
									size="sm"
									variant={replaySpeed === speed ? "default" : "outline"}
								>
									{speed}x
								</Button>
							))}
						</div>
					</div>

					{/* Progress Bar */}
					<div className="space-y-2">
						<div className="flex items-center justify-between text-gray-600 text-sm">
							<span>Progress</span>
							<span>{Math.round(progress)}%</span>
						</div>
						<Progress className="w-full" value={progress} />
					</div>

					{/* Current Snapshot Info */}
					{currentSnapshot && (
						<div className="rounded-lg bg-gray-50 p-3">
							<div className="mb-2 flex items-center justify-between">
								<div className="flex items-center space-x-2">
									<div
										className={`h-3 w-3 rounded-full ${SNAPSHOT_COLORS[currentSnapshot.type]}`}
									/>
									<span className="font-medium">Step {currentSnapshot.stepNumber}
									</span>
									<Badge variant="outline">{currentSnapshot.type}</Badge>
								</div>
								<span className="text-gray-600 text-sm">
									{currentSnapshot.timestamp.toLocaleTimeString()}
								</span>
							</div>
							{currentSnapshot.metadata.description && (
								<p className="text-gray-700 text-sm">
									{currentSnapshot.metadata.description}
								</p>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Timeline Visualization */}
			<Card>
				<CardHeader>
					<CardTitle>Execution Timeline</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="relative overflow-x-auto">
						<div className="flex min-w-max items-center space-x-1 pb-4">
							{snapshots.map((snapshot, index) => (
								<div
									className="group relative cursor-pointer"
									key={snapshot.id}
									onClick={() => jumpToSnapshot(snapshot)}
								>
									{/* Timeline line */}
									{index < snapshots.length - 1 && (
										<div className="absolute top-3 left-6 h-0.5 w-8 bg-gray-300" />
									)}

									{/* Snapshot marker */}
									<div
										className={`relative z-10 h-6 w-6 rounded-full border-2 border-white shadow-sm ${SNAPSHOT_COLORS[snapshot.type]} ${currentSnapshot?.id === snapshot.id ? "ring-2 ring-blue-500 ring-offset-2" : ""}hover:scale-110 transition-transform `}
									>
										<div className="absolute inset-0 flex items-center justify-center text-white">
											{SNAPSHOT_ICONS[snapshot.type]}
										</div>
									</div>

									{/* Tooltip */}
									<div className="-translate-x-1/2 pointer-events-none absolute bottom-8 left-1/2 transform whitespace-nowrap rounded bg-black px-2 py-1 text-white text-xs opacity-0 transition-opacity group-hover:opacity-100">
										<div>{snapshot.type}</div>
										<div>Step {snapshot.stepNumber}</div>
										{snapshot.metadata.description && (
											<div className="max-w-48 truncate">
												{snapshot.metadata.description}
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Snapshot Comparison */}
			{showDiff && currentSnapshot && compareSnapshot && (
				<Card>
					<CardHeader>
						<CardTitle>Snapshot Comparison</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="flex items-center space-x-4">
								<div className="flex-1">
									<label className="font-medium text-sm">Compare From:</label>
									<div className="mt-1 rounded bg-gray-50 p-2">Step {compareSnapshot.stepNumber} - {compareSnapshot.type}
									</div>
								</div>
								<div className="flex-1">
									<label className="font-medium text-sm">Compare To:</label>
									<div className="mt-1 rounded bg-gray-50 p-2">Step {currentSnapshot.stepNumber} - {currentSnapshot.type}
									</div>
								</div>
							</div>

							{(() => {
								const diff = calculateDiff(compareSnapshot, currentSnapshot);
								return (
									<div className="space-y-2">
										<div className="font-medium text-sm">Changes Summary:</div>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>State Changes: {diff.summary.stateChanges}</div>
											<div>Memory Changes: {diff.summary.memoryChanges}</div>
											<div>Output Changes: {diff.summary.outputChanges}</div>
											<div>Performance Impact:{" "}
												{Object.keys(diff.summary.performanceChanges).length}
											</div>
										</div>
									</div>
								);
							})()}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Quick Actions */}
			<div className="flex items-center space-x-2">
				<Button
					disabled={!currentSnapshot}
					onClick={() => setShowDiff(!showDiff)}
					size="sm"
					variant="outline"
				>
					<Zap className="mr-2 h-4 w-4" />
					{showDiff ? "Hide" : "Show"} Diff
				</Button>

				{currentSnapshot && (
					<Button
						disabled={!currentSnapshot}
						onClick={() => setCompareSnapshot(currentSnapshot)}
						size="sm"
						variant="outline"