/**
 * Task List Example Component
 *
 * Demonstrates how to use the new TanStack Query hooks with Redis caching
 * instead of the old Zustand stores
 */

"use client";

import { Archive, Pause, Play, Plus, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import {
	type Task,
	useArchiveTask,
	useCancelTask,
	useCreateTask,
	useDeleteTask,
	usePauseTask,
	useResumeTask,
	useTasks,
	useUpdateTask,
} from "@/lib/query/hooks";

interface TaskListExampleProps {
	className?: string;
}

export function TaskListExample({ className = "" }: TaskListExampleProps) {
	const [showArchived, setShowArchived] = useState(false);
	const [newTaskTitle, setNewTaskTitle] = useState("");

	// Fetch tasks with filters
	const {
		data: tasksData,
		isLoading,
		error,
		refetch,
	} = useTasks({
		archived: showArchived,
	});

	// Mutations
	const createTask = useCreateTask();
	const updateTask = useUpdateTask();
	const deleteTask = useDeleteTask();
	const archiveTask = useArchiveTask();
	const pauseTask = usePauseTask();
	const resumeTask = useResumeTask();
	const cancelTask = useCancelTask();

	const tasks = tasksData?.tasks || [];

	const handleCreateTask = async () => {
		if (!newTaskTitle.trim()) return;

		try {
			await createTask.mutateAsync({
				title: newTaskTitle,
				description: "",
				status: "IN_PROGRESS",
				branch: "main",
				sessionId: "example-session",
				repository: "example-repo",
				mode: "code",
				hasChanges: false,
				messages: [],
			});
			setNewTaskTitle("");
		} catch (error) {
			console.error("Failed to create task:", error);
		}
	};

	const handleUpdateTaskTitle = async (taskId: string, newTitle: string) => {
		try {
			await updateTask.mutateAsync({
				id: taskId,
				data: { title: newTitle },
			});
		} catch (error) {
			console.error("Failed to update task:", error);
		}
	};

	const handleTaskAction = async (taskId: string, action: string) => {
		try {
			switch (action) {
				case "archive":
					await archiveTask.mutateAsync(taskId);
					break;
				case "pause":
					await pauseTask.mutateAsync(taskId);
					break;
				case "resume":
					await resumeTask.mutateAsync(taskId);
					break;
				case "cancel":
					await cancelTask.mutateAsync(taskId);
					break;
				case "delete":
					await deleteTask.mutateAsync(taskId);
					break;
			}
		} catch (error) {
			console.error(`Failed to ${action} task:`, error);
		}
	};

	if (isLoading) {
		return (
			<div className={`p-6 ${className}`}>
				<div className="flex items-center justify-center space-x-2">
					<RefreshCw className="h-4 w-4 animate-spin" />
					<span>Loading tasks...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className={`p-6 ${className}`}>
				<div className="rounded-lg border border-red-200 bg-red-50 p-4">
					<div className="font-medium text-red-800">Error loading tasks</div>
					<div className="mt-1 text-red-600 text-sm">{error.message}</div>
					<button
						className="mt-2 text-red-600 text-sm underline hover:text-red-800"
						onClick={() => refetch()}
					>
						Try again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className={`p-6 ${className}`}>
			<div className="mb-6">
				<h2 className="mb-4 font-semibold text-xl">Tasks ({tasks.length})</h2>

				{/* Create new task */}
				<div className="mb-4 flex space-x-2">
					<input
						className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						onChange={(e) => setNewTaskTitle(e.target.value)}
						onKeyPress={(e) => e.key === "Enter" && handleCreateTask()}
						placeholder="Enter task title..."
						type="text"
						value={newTaskTitle}
					/>
					<button
						className="flex items-center space-x-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={createTask.isPending || !newTaskTitle.trim()}
						onClick={handleCreateTask}
					>
						{createTask.isPending ? (
							<RefreshCw className="h-4 w-4 animate-spin" />
						) : (
							<Plus className="h-4 w-4" />
						)}
						<span>Add Task</span>
					</button>
				</div>

				{/* Filter toggle */}
				<div className="flex items-center space-x-4">
					<button
						className={`rounded-md px-3 py-1 text-sm ${
							showArchived ? "bg-gray-200 text-gray-800" : "bg-blue-100 text-blue-800"
						}`}
						onClick={() => setShowArchived(!showArchived)}
					>
						{showArchived ? "Show Active" : "Show Archived"}
					</button>

					<button
						className="flex items-center space-x-1 text-gray-600 text-sm hover:text-gray-800"
						onClick={() => refetch()}
					>
						<RefreshCw className="h-3 w-3" />
						<span>Refresh</span>
					</button>
				</div>
			</div>

			{/* Task list */}
			<div className="space-y-3">
				{tasks.length === 0 ? (
					<div className="py-8 text-center text-gray-500">
						{showArchived ? "No archived tasks" : "No active tasks"}
					</div>
				) : (
					tasks.map((task) => (
						<TaskItem
							isUpdating={updateTask.isPending}
							key={task.id}
							onAction={(action) => handleTaskAction(task.id, action)}
							onUpdateTitle={(newTitle) => handleUpdateTaskTitle(task.id, newTitle)}
							task={task}
						/>
					))
				)}
			</div>

			{/* Mutation status */}
			{(createTask.error || updateTask.error || deleteTask.error) && (
				<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
					<div className="text-red-800 text-sm">
						{createTask.error?.message || updateTask.error?.message || deleteTask.error?.message}
					</div>
				</div>
			)}
		</div>
	);
}

interface TaskItemProps {
	task: Task;
	onUpdateTitle: (newTitle: string) => void;
	onAction: (action: string) => void;
	isUpdating: boolean;
}

function TaskItem({ task, onUpdateTitle, onAction, isUpdating }: TaskItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editTitle, setEditTitle] = useState(task.title);

	const handleSaveTitle = () => {
		if (editTitle.trim() !== task.title) {
			onUpdateTitle(editTitle.trim());
		}
		setIsEditing(false);
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "IN_PROGRESS":
				return "bg-blue-100 text-blue-800";
			case "DONE":
				return "bg-green-100 text-green-800";
			case "PAUSED":
				return "bg-yellow-100 text-yellow-800";
			case "CANCELLED":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
			<div className="flex items-start justify-between">
				<div className="flex-1">
					{isEditing ? (
						<div className="flex space-x-2">
							<input
								autoFocus
								className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
								onBlur={handleSaveTitle}
								onChange={(e) => setEditTitle(e.target.value)}
								onKeyPress={(e) => e.key === "Enter" && handleSaveTitle()}
								type="text"
								value={editTitle}
							/>
						</div>
					) : (
						<h3
							className="cursor-pointer font-medium hover:text-blue-600"
							onClick={() => setIsEditing(true)}
						>
							{task.title}
						</h3>
					)}

					<div className="mt-2 flex items-center space-x-2">
						<span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(task.status)}`}>
							{task.status}
						</span>
						<span className="text-gray-500 text-xs">
							{task.mode} • {task.repository}
						</span>
					</div>
				</div>

				<div className="ml-4 flex items-center space-x-1">
					{task.status === "IN_PROGRESS" && (
						<button
							className="p-1 text-gray-400 hover:text-yellow-600"
							onClick={() => onAction("pause")}
							title="Pause task"
						>
							<Pause className="h-4 w-4" />
						</button>
					)}

					{task.status === "PAUSED" && (
						<button
							className="p-1 text-gray-400 hover:text-blue-600"
							onClick={() => onAction("resume")}
							title="Resume task"
						>
							<Play className="h-4 w-4" />
						</button>
					)}

					{!task.isArchived && (
						<button
							className="p-1 text-gray-400 hover:text-gray-600"
							onClick={() => onAction("archive")}
							title="Archive task"
						>
							<Archive className="h-4 w-4" />
						</button>
					)}

					<button
						className="p-1 text-gray-400 hover:text-red-600"
						onClick={() => onAction("delete")}
						title="Delete task"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>

			{isUpdating && (
				<div className="mt-2 flex items-center space-x-1 text-gray-500 text-xs">
					<RefreshCw className="h-3 w-3 animate-spin" />
					<span>Updating...</span>
				</div>
			)}
		</div>
	);
}
