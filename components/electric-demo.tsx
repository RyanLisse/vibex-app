"use client";

import { useState } from "react";
	ElectricConnectionStatus,
	ElectricOfflineIndicator,
	ElectricSyncButton,
	useElectricContext,
} from "@/components/providers/electric-provider";
	useElectricEnvironments,
	useElectricTasks,
} from "@/hooks/use-electric-tasks";

// Demo component to showcase ElectricSQL integration
export function ElectricDemo() {
	const [userId] = useState("demo-user-123"); // In real app, get from auth
	const { isReady, isConnected, isSyncing, error } = useElectricContext();

	const {
		tasks,
		taskStats,
		loading: tasksLoading,
		error: tasksError,
		createTask,
		updateTask,
		deleteTask,
	} = useElectricTasks(userId);

	const {
		environments,
		activeEnvironment,
		loading: environmentsLoading,
		error: environmentsError,
		createEnvironment,
		activateEnvironment,
	} = useElectricEnvironments(userId);

	const [newTaskTitle, setNewTaskTitle] = useState("");
	const [newTaskDescription, setNewTaskDescription] = useState("");
	const [newEnvName, setNewEnvName] = useState("");

	// Handle creating a new task
	const handleCreateTask = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTaskTitle.trim()) return;

		try {
			await createTask({
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

	// Handle creating a new environment
	const handleCreateEnvironment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newEnvName.trim()) return;

		try {
			await createEnvironment({
				name: newEnvName,
				config: { type: "development", settings: {} },
				isActive: false,
				userId,
			});
			setNewEnvName("");
		} catch (error) {
			console.error("Failed to create environment:", error);
		}
	};

	// Handle task status update
	const handleUpdateTaskStatus = async (taskId: string, status: string) => {
		try {
			await updateTask(taskId, { status });
		} catch (error) {
			console.error("Failed to update task:", error);
		}
	};

	if (!isReady) {
		return (
			<div className="mx-auto max-w-4xl p-6">
				<div className="text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2" />
					<p className="text-gray-600">Initializing ElectricSQL...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="mx-auto max-w-4xl p-6">
				<div className="rounded-lg border border-red-200 bg-red-50 p-4">
					<h3 className="font-medium text-red-800">ElectricSQL Error</h3>
					<p className="mt-1 text-red-600 text-sm">{error.message}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-4xl space-y-8 p-6">
			{/* Header with connection status */}
			<div className="flex items-center justify-between">
				<h1 className="font-bold text-3xl">ElectricSQL Demo</h1>
				<div className="flex items-center space-x-4">
					<ElectricConnectionStatus />
					<ElectricSyncButton />
				</div>
			</div>

			{/* Connection info */}
			<div className="rounded-lg bg-gray-50 p-4">
				<h2 className="mb-2 font-semibold text-lg">Connection Status</h2>
				<div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
					<div>
						<span className="text-gray-600">Ready:</span>
						<span
							className={`ml-2 ${isReady ? "text-green-600" : "text-red-600"}`}
						>
							{isReady ? "Yes" : "No"}
						</span>
					</div>
					<div>
						<span className="text-gray-600">Connected:</span>
						<span
							className={`ml-2 ${isConnected ? "text-green-600" : "text-red-600"}`}
						>
							{isConnected ? "Yes" : "No"}
						</span>
					</div>
					<div>
						<span className="text-gray-600">Syncing:</span>
						<span
							className={`ml-2 ${isSyncing ? "text-blue-600" : "text-gray-600"}`}
						>
							{isSyncing ? "Yes" : "No"}
						</span>
					</div>
					<div>
						<span className="text-gray-600">User ID:</span>
						<span className="ml-2 text-gray-800">{userId}</span>
					</div>
				</div>
			</div>

			{/* Tasks Section */}
			<div className="rounded-lg border bg-white p-6">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-semibold text-xl">Tasks</h2>
					{tasksLoading && (
						<div className="text-gray-500 text-sm">Loading...</div>
					)}
				</div>

				{/* Task Statistics */}
				<div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 md:grid-cols-4">
					<div className="text-center">
						<div className="font-bold text-2xl text-blue-600">
							{taskStats.total}
						</div>
						<div className="text-gray-600 text-sm">Total</div>
					</div>
					<div className="text-center">
						<div className="font-bold text-2xl text-yellow-600">
							{taskStats.pending}
						</div>
						<div className="text-gray-600 text-sm">Pending</div>
					</div>
					<div className="text-center">
						<div className="font-bold text-2xl text-blue-600">
							{taskStats.inProgress}
						</div>
						<div className="text-gray-600 text-sm">In Progress</div>
					</div>
					<div className="text-center">
						<div className="font-bold text-2xl text-green-600">
							{taskStats.completed}
						</div>
						<div className="text-gray-600 text-sm">Completed</div>
					</div>
				</div>

				{/* Create Task Form */}
				<form
					className="mb-6 rounded-lg border p-4"
					onSubmit={handleCreateTask}
				>
					<h3 className="mb-3 font-medium">Create New Task</h3>
					<div className="space-y-3">
						<input
							className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							onChange={(e) => setNewTaskTitle(e.target.value)}
							placeholder="Task title"
							type="text"
							value={newTaskTitle}
						/>
						<textarea
							className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							onChange={(e) => setNewTaskDescription(e.target.value)}
							placeholder="Task description (optional)"
							rows={2}
							value={newTaskDescription}
						/>
						<button
							className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
							disabled={!newTaskTitle.trim()}
							type="submit"
						>
							Create Task
						</button>
					</div>
				</form>

				{/* Tasks List */}
				{tasksError ? (
					<div className="text-red-600 text-sm">
						Error loading tasks: {tasksError.message}
					</div>
				) : (
					<div className="space-y-3">
						{tasks.length === 0 ? (
							<div className="py-8 text-center text-gray-500">
								No tasks yet. Create your first task above!
							</div>
						) : (
							tasks.map((task) => (
								<div className="rounded-lg border p-4" key={task.id}>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<h4 className="font-medium">{task.title}</h4>
											{task.description && (
												<p className="mt-1 text-gray-600 text-sm">
													{task.description}
												</p>
											)}
											<div className="mt-2 flex items-center space-x-4 text-gray-500 text-xs">
												<span>Priority: {task.priority}</span>
												<span>
													Created:{" "}
													{new Date(task.createdAt).toLocaleDateString()}
												</span>
											</div>
										</div>
										<div className="flex items-center space-x-2">
											<select
												className="rounded border px-2 py-1 text-sm"
												onChange={(e) =>
													handleUpdateTaskStatus(task.id, e.target.value)
												}
												value={task.status}
											>
												<option value="pending">Pending</option>
												<option value="in_progress">In Progress</option>
												<option value="completed">Completed</option>
												<option value="cancelled">Cancelled</option>
											</select>
											<button
												className="text-red-600 text-sm hover:text-red-800"
												onClick={() => deleteTask(task.id)}
											>
												Delete
											</button>
										</div>
									</div>
								</div>
							))
						)}
					</div>
				)}
			</div>

			{/* Environments Section */}
			<div className="rounded-lg border bg-white p-6">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-semibold text-xl">Environments</h2>
					{environmentsLoading && (
						<div className="text-gray-500 text-sm">Loading...</div>
					)}
				</div>

				{/* Create Environment Form */}
				<form
					className="mb-6 rounded-lg border p-4"
					onSubmit={handleCreateEnvironment}
				>
					<h3 className="mb-3 font-medium">Create New Environment</h3>
					<div className="flex space-x-3">
						<input
							className="flex-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							onChange={(e) => setNewEnvName(e.target.value)}
							placeholder="Environment name"
							type="text"
							value={newEnvName}
						/>
						<button
							className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
							disabled={!newEnvName.trim()}
							type="submit"
						>
							Create
						</button>
					</div>
				</form>

				{/* Environments List */}
				{environmentsError ? (
					<div className="text-red-600 text-sm">
						Error loading environments: {environmentsError.message}
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{environments.length === 0 ? (
							<div className="col-span-full py-8 text-center text-gray-500">
								No environments yet. Create your first environment above!
							</div>
						) : (
							environments.map((env) => (
								<div
									className={`rounded-lg border p-4 ${
										env.isActive
											? "border-green-500 bg-green-50"
											: "border-gray-200"
									}`}
									key={env.id}
								>
									<div className="mb-2 flex items-center justify-between">
										<h4 className="font-medium">{env.name}</h4>
										{env.isActive && (
											<span className="rounded bg-green-100 px-2 py-1 text-green-800 text-xs">
												Active
											</span>
										)}
									</div>
									<div className="mb-3 text-gray-500 text-xs">
										Created: {new Date(env.createdAt).toLocaleDateString()}
									</div>
									{!env.isActive && (
										<button
											className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
											onClick={() => activateEnvironment(env.id)}
										>
											Activate
										</button>
									)}
								</div>
							))
						)}
					</div>
				)}
			</div>

			{/* Offline Indicator */}
			<ElectricOfflineIndicator />
		</div>
	);
}
