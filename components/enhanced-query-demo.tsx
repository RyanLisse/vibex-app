"use client";

import { useMemo, useState } from "react";
import {
	QueryCacheStatus,
	QueryPerformanceMonitor,
	WASMOptimizationStatus,
} from "@/components/providers/query-provider";
import {
	useExecutionAnalyticsQuery,
	useExecutionsQuery,
} from "@/hooks/use-execution-queries";
import {
	useBulkTaskMutation,
	useCreateTaskMutation,
	useTaskSearchQuery,
	useTasksQuery,
	useUpdateTaskMutation,
} from "@/hooks/use-task-queries";

/**
 * Demo component showcasing Enhanced TanStack Query integration
 */
export function EnhancedQueryDemo() {
	const [userId] = useState("demo-user-123");
	const [searchQuery, setSearchQuery] = useState("");
	const [useSemanticSearch, setUseSemanticSearch] = useState(false);
	const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

	// Task filters
	const [taskFilters, setTaskFilters] = useState({
		status: [] as string[],
		priority: [] as string[],
		userId,
	});

	// Enhanced task queries with WASM optimization
	const {
		tasks,
		loading: tasksLoading,
		error: tasksError,
		refetch: refetchTasks,
		isStale: tasksStale,
		isFetching: tasksFetching,
	} = useTasksQuery(taskFilters);

	// Semantic search with vector search
	const {
		tasks: searchResults,
		loading: searchLoading,
		isSemanticSearch,
		refetch: refetchSearch,
	} = useTaskSearchQuery({
		query: searchQuery,
		useSemanticSearch,
		filters: taskFilters,
		limit: 20,
	});

	// Execution analytics with WASM optimization
	const {
		analytics,
		loading: analyticsLoading,
		error: analyticsError,
	} = useExecutionAnalyticsQuery({ taskId: undefined });

	// Mutations with optimistic updates
	const createTaskMutation = useCreateTaskMutation();
	const updateTaskMutation = useUpdateTaskMutation();
	const bulkTaskMutation = useBulkTaskMutation();

	// Form state
	const [newTaskTitle, setNewTaskTitle] = useState("");
	const [newTaskDescription, setNewTaskDescription] = useState("");

	// Display data - use search results if searching, otherwise use filtered tasks
	const displayTasks = useMemo(() => {
		return searchQuery.trim() ? searchResults || [] : tasks;
	}, [searchQuery, searchResults, tasks]);

	// Task statistics
	const taskStats = useMemo(() => {
		if (!displayTasks)
			return { total: 0, pending: 0, inProgress: 0, completed: 0 };

		return {
			total: displayTasks.length,
			pending: displayTasks.filter((t) => t.status === "pending").length,
			inProgress: displayTasks.filter((t) => t.status === "in_progress").length,
			completed: displayTasks.filter((t) => t.status === "completed").length,
		};
	}, [displayTasks]);

	// Handle task creation
	const handleCreateTask = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTaskTitle.trim()) return;

		try {
			await createTaskMutation.mutateAsync({
				title: newTaskTitle,
				description: newTaskDescription || undefined,
				status: "pending",
				priority: "medium",
				userId,
			});
			setNewTaskTitle("");
			setNewTaskDescription("");
		} catch (error) {
			console.error("Failed to create task:", error);
		}
	};

	// Handle bulk status update
	const handleBulkStatusUpdate = async (status: string) => {
		if (!selectedTasks.length) return;

		try {
			await bulkTaskMutation.mutateAsync({
				taskIds: selectedTasks,
				updates: { status },
			});
			setSelectedTasks([]);
		} catch (error) {
			console.error("Failed to bulk update tasks:", error);
		}
	};

	// Handle task selection
	const handleTaskSelection = (taskId: string, selected: boolean) => {
		setSelectedTasks((prev) =>
			selected ? [...prev, taskId] : prev.filter((id) => id !== taskId),
		);
	};

	return (
		<div className="mx-auto max-w-6xl space-y-8 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="font-bold text-3xl">Enhanced TanStack Query Demo</h1>
				<div className="flex items-center space-x-4">
					<QueryCacheStatus />
				</div>
			</div>

			{/* WASM Status */}
			<WASMOptimizationStatus />

			{/* Search Section */}
			<div className="rounded-lg border bg-white p-6">
				<h2 className="mb-4 font-semibold text-xl">Smart Search</h2>
				<div className="space-y-4">
					<div className="flex space-x-4">
						<input
							className="flex-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search tasks..."
							type="text"
							value={searchQuery}
						/>
						<label className="flex items-center space-x-2">
							<input
								checked={useSemanticSearch}
								className="rounded"
								onChange={(e) => setUseSemanticSearch(e.target.checked)}
								type="checkbox"
							/>
							<span className="text-sm">Semantic Search (WASM)</span>
						</label>
					</div>

					{searchQuery && (
						<div className="text-gray-600 text-sm">
							{searchLoading ? (
								<span>Searching...</span>
							) : (
								<span>
									Found {searchResults?.length || 0} results
									{isSemanticSearch && " (using WASM vector search)"}
								</span>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Filters Section */}
			<div className="rounded-lg border bg-white p-6">
				<h2 className="mb-4 font-semibold text-xl">Filters</h2>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div>
						<label className="mb-2 block font-medium text-sm">Status</label>
						<div className="space-y-2">
							{["pending", "in_progress", "completed", "cancelled"].map(
								(status) => (
									<label className="flex items-center space-x-2" key={status}>
										<input
											checked={taskFilters.status.includes(status)}
											className="rounded"
											onChange={(e) => {
												setTaskFilters((prev) => ({
													...prev,
													status: e.target.checked
														? [...prev.status, status]
														: prev.status.filter((s) => s !== status),
												}));
											}}
											type="checkbox"
										/>
										<span className="text-sm capitalize">
											{status.replace("_", " ")}
										</span>
									</label>
								),
							)}
						</div>
					</div>

					<div>
						<label className="mb-2 block font-medium text-sm">Priority</label>
						<div className="space-y-2">
							{["low", "medium", "high"].map((priority) => (
								<label className="flex items-center space-x-2" key={priority}>
									<input
										checked={taskFilters.priority.includes(priority)}
										className="rounded"
										onChange={(e) => {
											setTaskFilters((prev) => ({
												...prev,
												priority: e.target.checked
													? [...prev.priority, priority]
													: prev.priority.filter((p) => p !== priority),
											}));
										}}
										type="checkbox"
									/>
									<span className="text-sm capitalize">{priority}</span>
								</label>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Task Statistics */}
			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				<div className="rounded-lg border bg-white p-4 text-center">
					<div className="font-bold text-2xl text-blue-600">
						{taskStats.total}
					</div>
					<div className="text-gray-600 text-sm">Total Tasks</div>
				</div>
				<div className="rounded-lg border bg-white p-4 text-center">
					<div className="font-bold text-2xl text-yellow-600">
						{taskStats.pending}
					</div>
					<div className="text-gray-600 text-sm">Pending</div>
				</div>
				<div className="rounded-lg border bg-white p-4 text-center">
					<div className="font-bold text-2xl text-blue-600">
						{taskStats.inProgress}
					</div>
					<div className="text-gray-600 text-sm">In Progress</div>
				</div>
				<div className="rounded-lg border bg-white p-4 text-center">
					<div className="font-bold text-2xl text-green-600">
						{taskStats.completed}
					</div>
					<div className="text-gray-600 text-sm">Completed</div>
				</div>
			</div>

			{/* Create Task Form */}
			<div className="rounded-lg border bg-white p-6">
				<h2 className="mb-4 font-semibold text-xl">
					Create New Task (with Optimistic Updates)
				</h2>
				<form className="space-y-4" onSubmit={handleCreateTask}>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<input
							className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							onChange={(e) => setNewTaskTitle(e.target.value)}
							placeholder="Task title"
							type="text"
							value={newTaskTitle}
						/>
						<input
							className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							onChange={(e) => setNewTaskDescription(e.target.value)}
							placeholder="Task description (optional)"
							type="text"
							value={newTaskDescription}
						/>
					</div>
					<button
						className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
						disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
						type="submit"
					>
						{createTaskMutation.isPending ? "Creating..." : "Create Task"}
					</button>
				</form>
			</div>

			{/* Bulk Operations */}
			{selectedTasks.length > 0 && (
				<div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
					<div className="flex items-center justify-between">
						<span className="font-medium text-sm">
							{selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""}{" "}
							selected
						</span>
						<div className="space-x-2">
							<button
								className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:bg-gray-300"
								disabled={bulkTaskMutation.isPending}
								onClick={() => handleBulkStatusUpdate("completed")}
							>
								Mark Completed
							</button>
							<button
								className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:bg-gray-300"
								disabled={bulkTaskMutation.isPending}
								onClick={() => handleBulkStatusUpdate("cancelled")}
							>
								Cancel
							</button>
							<button
								className="rounded bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-700"
								onClick={() => setSelectedTasks([])}
							>
								Clear Selection
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Tasks List */}
			<div className="rounded-lg border bg-white p-6">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-semibold text-xl">
						Tasks{" "}
						{tasksStale && (
							<span className="text-orange-600 text-sm">(stale)</span>
						)}
					</h2>
					<div className="flex items-center space-x-2">
						{tasksFetching && (
							<div className="text-blue-600 text-sm">Fetching...</div>
						)}
						<button
							className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
							onClick={() => refetchTasks()}
						>
							Refresh
						</button>
					</div>
				</div>

				{tasksLoading ? (
					<div className="py-8 text-center">
						<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2" />
						<p className="text-gray-600">Loading tasks...</p>
					</div>
				) : tasksError ? (
					<div className="py-8 text-center text-red-600">
						Error loading tasks: {tasksError.message}
					</div>
				) : displayTasks?.length ? (
					<div className="space-y-3">
						{displayTasks.map((task) => (
							<div className="rounded-lg border p-4" key={task.id}>
								<div className="flex items-start space-x-3">
									<input
										checked={selectedTasks.includes(task.id)}
										className="mt-1 rounded"
										onChange={(e) =>
											handleTaskSelection(task.id, e.target.checked)
										}
										type="checkbox"
									/>
									<div className="flex-1">
										<h4 className="font-medium">{task.title}</h4>
										{task.description && (
											<p className="mt-1 text-gray-600 text-sm">
												{task.description}
											</p>
										)}
										<div className="mt-2 flex items-center space-x-4 text-gray-500 text-xs">
											<span
												className={`rounded px-2 py-1 ${
													task.status === "completed"
														? "bg-green-100 text-green-800"
														: task.status === "in_progress"
															? "bg-blue-100 text-blue-800"
															: task.status === "cancelled"
																? "bg-red-100 text-red-800"
																: "bg-yellow-100 text-yellow-800"
												}`}
											>
												{task.status.replace("_", " ")}
											</span>
											<span
												className={`rounded px-2 py-1 ${
													task.priority === "high"
														? "bg-red-100 text-red-800"
														: task.priority === "medium"
															? "bg-yellow-100 text-yellow-800"
															: "bg-green-100 text-green-800"
												}`}
											>
												{task.priority}
											</span>
											<span>
												Created: {new Date(task.createdAt).toLocaleDateString()}
											</span>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="py-8 text-center text-gray-500">
						No tasks found. Create your first task above!
					</div>
				)}
			</div>

			{/* Analytics Section */}
			{analytics && (
				<div className="rounded-lg border bg-white p-6">
					<h2 className="mb-4 font-semibold text-xl">
						Execution Analytics (WASM Optimized)
					</h2>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						<div className="text-center">
							<div className="font-bold text-2xl text-blue-600">
								{analytics.totalExecutions}
							</div>
							<div className="text-gray-600 text-sm">Total Executions</div>
						</div>
						<div className="text-center">
							<div className="font-bold text-2xl text-green-600">
								{analytics.successRate}%
							</div>
							<div className="text-gray-600 text-sm">Success Rate</div>
						</div>
						<div className="text-center">
							<div className="font-bold text-2xl text-purple-600">
								{analytics.averageExecutionTime}ms
							</div>
							<div className="text-gray-600 text-sm">Avg Time</div>
						</div>
						<div className="text-center">
							<div className="font-bold text-2xl text-orange-600">
								{Object.keys(analytics.executionsByAgent).length}
							</div>
							<div className="text-gray-600 text-sm">Agent Types</div>
						</div>
					</div>
				</div>
			)}

			{/* Performance Monitor */}
			<QueryPerformanceMonitor />
		</div>
	);
}
