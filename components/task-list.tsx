"use client";
import { formatDistanceToNow } from "date-fns";
	AlertCircle,
	Archive,
	Check,
	Dot,
	RefreshCw,
	Trash2,
	Wifi,
	WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useElectricContext } from "@/components/providers/electric-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextShimmer } from "@/components/ui/text-shimmer";
	useDeleteTaskMutation,
	useTasksQuery,
	useUpdateTaskMutation,
} from "@/hooks/use-task-queries";
import { observability } from "@/lib/observability";

interface TaskListProps {
	userId?: string;
	filters?: {
		status?: string[];
		priority?: string[];
		search?: string;
	};
}

export default function TaskList({ userId, filters = {} }: TaskListProps) {
	const [isHydrated, setIsHydrated] = useState(false);

	// ElectricSQL connection status
	const { isConnected, isSyncing, error: electricError } = useElectricContext();

	// Query for active tasks
	const {
		tasks: activeTasks,
		loading: activeLoading,
		error: activeError,
		refetch: refetchActive,
		isStale: activeStale,
		isFetching: activeFetching,
	} = useTasksQuery({
		...filters,
		status: ["pending", "in_progress"],
		userId,
	});

	// Query for archived tasks
	const {
		tasks: archivedTasks,
		loading: archivedLoading,
		error: archivedError,
		refetch: refetchArchived,
		isStale: archivedStale,
		isFetching: archivedFetching,
	} = useTasksQuery({
		...filters,
		status: ["completed", "cancelled"],
		userId,
	});

	// Mutations
	const updateTaskMutation = useUpdateTaskMutation();
	const deleteTaskMutation = useDeleteTaskMutation();

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	// Handle task archiving (mark as completed)
	const handleArchiveTask = async (taskId: string) => {
		try {
			await updateTaskMutation.mutateAsync({
				taskId,
				updates: {
					status: "completed",
					completedAt: new Date(),
				},
			});

			// Record user action
			await observability.events.collector.collectEvent(
				"user_action",
				"info",
				`Task archived: ${taskId}`,
				{ taskId, userId, action: "archive" },
				"ui",
				["task", "archive"],
			);
		} catch (error) {
			console.error("Failed to archive task:", error);
		}
	};

	// Handle task deletion
	const handleDeleteTask = async (taskId: string) => {
		if (
			!confirm(
				"Are you sure you want to delete this task? This action cannot be undone.",
			)
		) {
			return;
		}

		try {
			await deleteTaskMutation.mutateAsync(taskId);

			// Record user action
			await observability.events.collector.collectEvent(
				"user_action",
				"info",
				`Task deleted: ${taskId}`,
				{ taskId, userId, action: "delete" },
				"ui",
				["task", "delete"],
			);
		} catch (error) {
			console.error("Failed to delete task:", error);
		}
	};

	// Handle manual refresh
	const handleRefresh = () => {
		refetchActive();
		refetchArchived();
	};

	// Connection status indicator
	const ConnectionStatus = () => (
		<div className="flex items-center gap-2 text-muted-foreground text-sm">
			{isConnected ? (
				<>
					<Wifi className="h-4 w-4 text-green-500" />
					<span>Online</span>
					{isSyncing && <RefreshCw className="h-4 w-4 animate-spin" />}
				</>
			) : (
				<>
					<WifiOff className="h-4 w-4 text-red-500" />
					<span>Offline</span>
				</>
			)}
		</div>
	);

	// Error display component
	const ErrorDisplay = ({
		error,
		onRetry,
	}: {
		error: Error;
		onRetry: () => void;
	}) => (
		<Alert className="mb-4" variant="destructive">
			<AlertCircle className="h-4 w-4" />
			<AlertDescription className="flex items-center justify-between">
				<span>Failed to load tasks: {error.message}</span>
				<Button onClick={onRetry} size="sm" variant="outline">
					Retry
				</Button>
			</AlertDescription>
		</Alert>
	);

	// Loading skeleton
	const LoadingSkeleton = () => (
		<div className="flex flex-col gap-1">
			{Array.from({ length: 3 }).map((_, index) => (
				<div className="rounded-lg border bg-background p-4" key={index}>
					<div className="flex items-center justify-between">
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-1/2" />
						</div>
						<Skeleton className="h-8 w-8" />
					</div>
				</div>
			))}
		</div>
	);

	if (!isHydrated) {
		return <LoadingSkeleton />;
	}

	return (
		<div className="mx-auto w-full max-w-3xl rounded-lg bg-muted p-1">
			<div className="flex items-center justify-between p-2">
				<ConnectionStatus />
				<div className="flex items-center gap-2">
					{(activeStale || archivedStale) && (
						<Badge className="text-xs" variant="outline">
							Stale Data
						</Badge>
					)}
					<Button
						disabled={activeFetching || archivedFetching}
						onClick={handleRefresh}
						size="sm"
						variant="ghost"
					>
						<RefreshCw
							className={`h-4 w-4 ${activeFetching || archivedFetching ? "animate-spin" : ""}`}
						/>
					</Button>
				</div>
			</div>

			<Tabs defaultValue="active">
				<TabsList>
					<TabsTrigger value="active">
						<Check className="h-4 w-4" />
						Tasks ({activeTasks?.length || 0})
					</TabsTrigger>
					<TabsTrigger value="archived">
						<Archive className="h-4 w-4" />
						Archive ({archivedTasks?.length || 0})
					</TabsTrigger>
				</TabsList>
				<TabsContent value="active">
					{electricError && (
						<Alert className="mb-4">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								Real-time sync unavailable. Working in offline mode.
							</AlertDescription>
						</Alert>
					)}

					{activeError && (
						<ErrorDisplay error={activeError} onRetry={refetchActive} />
					)}

					<div className="flex flex-col gap-1">
						{activeLoading ? (
							<LoadingSkeleton />
						) : activeTasks?.length === 0 ? (
							<p className="p-2 text-muted-foreground">No active tasks yet.</p>
						) : (
							activeTasks?.map((task) => (
								<div
									className="flex items-center justify-between rounded-lg border bg-background p-4 hover:bg-sidebar"
									key={task.id}
								>
									<Link className="flex-1" href={`/task/${task.id}`}>
										<div>
											<div className="flex items-center gap-x-2">
												{task.hasChanges && (
													<div className="size-2 rounded-full bg-blue-500" />
												)}
												<h3 className="font-medium">{task.title}</h3>
												<Badge
													variant={
														task.status === "completed"
															? "default"
															: task.status === "in_progress"
																? "secondary"
																: task.status === "cancelled"
																	? "destructive"
																	: "outline"
													}
												>
													{task.status.replace("_", " ")}
												</Badge>
												{task.priority === "high" && (
													<Badge className="text-xs" variant="destructive">
														High
													</Badge>
												)}
											</div>

											{task.description && (
												<p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
													{task.description}
												</p>
											)}

											{task.status === "in_progress" ? (
												<div>
													<TextShimmer className="text-sm">
														{`${task.statusMessage || "Working on your task"}...`}
													</TextShimmer>
												</div>
											) : (
												<div className="mt-1 flex items-center gap-0">
													<p className="text-muted-foreground text-sm">
														{task.createdAt
															? formatDistanceToNow(new Date(task.createdAt), {
																	addSuffix: true,
																})
															: "Just now"}
													</p>
													{task.updatedAt &&
														task.updatedAt !== task.createdAt && (
															<>
																<Dot className="size-4 text-muted-foreground" />
																<p className="text-muted-foreground text-sm">
																	Updated{" "}
																	{formatDistanceToNow(
																		new Date(task.updatedAt),
																		{ addSuffix: true },
																	)}
																</p>
															</>
														)}
													{task.repository && (
														<>
															<Dot className="size-4 text-muted-foreground" />
															<p className="text-muted-foreground text-sm">
																{task.repository}
															</p>
														</>
													)}
												</div>
											)}
										</div>
									</Link>

									<div className="flex items-center gap-2">
										{(task.status === "pending" ||
											task.status === "in_progress") && (
											<Button
												disabled={updateTaskMutation.isPending}
												onClick={() => handleArchiveTask(task.id)}
												size="icon"
												variant="outline"
											>
												<Archive className="h-4 w-4" />
											</Button>
										)}
									</div>
								</div>
							))
						)}
					</div>
				</TabsContent>
				<TabsContent value="archived">
					{archivedError && (
						<ErrorDisplay error={archivedError} onRetry={refetchArchived} />
					)}

					<div className="flex flex-col gap-1">
						{archivedLoading ? (
							<LoadingSkeleton />
						) : archivedTasks?.length === 0 ? (
							<p className="p-2 text-muted-foreground">
								No archived tasks yet.
							</p>
						) : (
							archivedTasks?.map((task) => (
								<div
									className="flex items-center justify-between rounded-lg border bg-background p-4 hover:bg-sidebar"
									key={task.id}
								>
									<Link className="flex-1" href={`/task/${task.id}`}>
										<div>
											<div className="flex items-center gap-x-2">
												<h3 className="font-medium text-muted-foreground">
													{task.title}
												</h3>
												<Badge
													variant={
														task.status === "completed"
															? "default"
															: task.status === "cancelled"
																? "destructive"
																: "outline"
													}
												>
													{task.status.replace("_", " ")}
												</Badge>
											</div>

											{task.description && (
												<p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
													{task.description}
												</p>
											)}

											<div className="mt-1 flex items-center gap-0">
												<p className="text-muted-foreground text-sm">
													Completed{" "}
													{task.completedAt
														? formatDistanceToNow(new Date(task.completedAt), {
																addSuffix: true,
															})
														: "recently"}
												</p>
												{task.branch && (
													<>
														<Dot className="size-4 text-muted-foreground" />
														<p className="text-muted-foreground text-sm">
															Branch: {task.branch}
														</p>
													</>
												)}
												{task.repository && (
													<>
														<Dot className="size-4 text-muted-foreground" />
														<p className="text-muted-foreground text-sm">
															{task.repository}
														</p>
													</>
												)}
											</div>
										</div>
									</Link>

									<Button
										disabled={deleteTaskMutation.isPending}
										onClick={() => handleDeleteTask(task.id)}
										size="icon"
										variant="outline"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))
						)}
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
