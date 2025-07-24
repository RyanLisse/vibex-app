/**
 * Test component to demonstrate TanStack Query + ElectricSQL integration
 */

"use client";

import type React from "react";
import { useState } from "react";
import type { NewTask } from "@/db/schema";
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from "@/lib/queries/hooks";

export function TasksTestComponent() {
	const [newTaskTitle, setNewTaskTitle] = useState("");
	const [filter, setFilter] = useState<{ status?: string; priority?: string }>({});

	// Query hooks
	const { data: tasksData, isLoading, error, refetch } = useTasks(filter);
	const createTaskMutation = useCreateTask();
	const updateTaskMutation = useUpdateTask();
	const deleteTaskMutation = useDeleteTask();

	// Handlers
	const handleCreateTask = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTaskTitle.trim()) return;

		const newTask: NewTask = {
			title: newTaskTitle,
			description: "Created from test component",
			status: "pending",
			priority: "medium",
		};

		try {
			await createTaskMutation.mutateAsync(newTask);
			setNewTaskTitle("");
		} catch (error) {
			console.error("Failed to create task:", error);
		}
	};

	const handleUpdateTask = async (id: string, status: string) => {
		try {
			await updateTaskMutation.mutateAsync({
				id,
				data: { status: status as any },
			});
		} catch (error) {
			console.error("Failed to update task:", error);
		}
	};

	const handleDeleteTask = async (id: string) => {
		if (!confirm("Are you sure you want to delete this task?")) return;

		try {
			await deleteTaskMutation.mutateAsync(id);
		} catch (error) {
			console.error("Failed to delete task:", error);
		}
	};

	if (isLoading) {
		return (
			<div className="p-6">
				<div className="animate-pulse">
					<div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
					<div className="space-y-3">
						<div className="h-4 bg-gray-200 rounded"></div>
						<div className="h-4 bg-gray-200 rounded w-5/6"></div>
						<div className="h-4 bg-gray-200 rounded w-4/6"></div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6">
				<div className="bg-red-50 border border-red-200 rounded-md p-4">
					<h3 className="text-red-800 font-medium">Error loading tasks</h3>
					<p className="text-red-600 text-sm mt-1">
						{error instanceof Error ? error.message : "Unknown error"}
					</p>
					<button
						onClick={() => refetch()}
						className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	const tasks = tasksData || [];

	return (
		<div className="p-6 max-w-4xl mx-auto">
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900 mb-4">Tasks Test Component</h1>
				<p className="text-gray-600 text-sm">
					Testing TanStack Query + ElectricSQL integration with optimistic updates
				</p>
			</div>

			{/* Create Task Form */}
			<div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
				<h2 className="text-lg font-semibold mb-3">Create New Task</h2>
				<form onSubmit={handleCreateTask} className="flex gap-2">
					<input
						type="text"
						value={newTaskTitle}
						onChange={(e) => setNewTaskTitle(e.target.value)}
						placeholder="Enter task title..."
						className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						disabled={createTaskMutation.isPending}
					/>
					<button
						type="submit"
						disabled={createTaskMutation.isPending || !newTaskTitle.trim()}
						className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{createTaskMutation.isPending ? "Creating..." : "Create Task"}
					</button>
				</form>
			</div>

			{/* Filters */}
			<div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
				<h2 className="text-lg font-semibold mb-3">Filters</h2>
				<div className="flex gap-4">
					<select
						value={filter.status || ""}
						onChange={(e) =>
							setFilter((prev) => ({
								...prev,
								status: e.target.value || undefined,
							}))
						}
						className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">All Statuses</option>
						<option value="pending">Pending</option>
						<option value="in_progress">In Progress</option>
						<option value="completed">Completed</option>
						<option value="cancelled">Cancelled</option>
					</select>
					<select
						value={filter.priority || ""}
						onChange={(e) =>
							setFilter((prev) => ({
								...prev,
								priority: e.target.value || undefined,
							}))
						}
						className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">All Priorities</option>
						<option value="low">Low</option>
						<option value="medium">Medium</option>
						<option value="high">High</option>
						<option value="urgent">Urgent</option>
					</select>
				</div>
			</div>

			{/* Tasks List */}
			<div className="bg-white rounded-lg border border-gray-200">
				<div className="px-4 py-3 border-b border-gray-200">
					<h2 className="text-lg font-semibold">Tasks ({tasks.length})</h2>
				</div>

				{tasks.length === 0 ? (
					<div className="p-8 text-center text-gray-500">
						<p>No tasks found</p>
						<p className="text-sm mt-1">Create a task to get started</p>
					</div>
				) : (
					<div className="divide-y divide-gray-200">
						{tasks.map((task) => (
							<div key={task.id} className="p-4">
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<h3 className="font-medium text-gray-900">{task.title}</h3>
										{task.description && (
											<p className="text-gray-600 text-sm mt-1">{task.description}</p>
										)}
										<div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${
													task.status === "completed"
														? "bg-green-100 text-green-800"
														: task.status === "in_progress"
															? "bg-blue-100 text-blue-800"
															: task.status === "cancelled"
																? "bg-red-100 text-red-800"
																: "bg-gray-100 text-gray-800"
												}`}
											>
												{task.status.replace("_", " ")}
											</span>
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${
													task.priority === "urgent"
														? "bg-red-100 text-red-800"
														: task.priority === "high"
															? "bg-orange-100 text-orange-800"
															: task.priority === "medium"
																? "bg-yellow-100 text-yellow-800"
																: "bg-gray-100 text-gray-800"
												}`}
											>
												{task.priority}
											</span>
											<span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
										</div>
									</div>
									<div className="flex items-center gap-2 ml-4">
										{task.status !== "completed" && (
											<button
												onClick={() => handleUpdateTask(task.id, "completed")}
												disabled={updateTaskMutation.isPending}
												className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
											>
												Complete
											</button>
										)}
										{task.status === "pending" && (
											<button
												onClick={() => handleUpdateTask(task.id, "in_progress")}
												disabled={updateTaskMutation.isPending}
												className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
											>
												Start
											</button>
										)}
										<button
											onClick={() => handleDeleteTask(task.id)}
											disabled={deleteTaskMutation.isPending}
											className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
										>
											Delete
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Mutation Status */}
			{(createTaskMutation.isPending ||
				updateTaskMutation.isPending ||
				deleteTaskMutation.isPending) && (
				<div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg">
					Processing...
				</div>
			)}
		</div>
	);
}
