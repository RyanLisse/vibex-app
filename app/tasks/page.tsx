/**
 * Tasks Page
 *
 * Mock page for E2E testing task management functionality.
 */

"use client";

import { CheckCircle, Clock, MoreHorizontal, Play, Plus, Square } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Task {
	id: string;
	title: string;
	description: string;
	priority: "low" | "medium" | "high";
	status: "pending" | "in-progress" | "completed" | "blocked";
	createdAt: Date;
}

export default function TasksPage() {
	const [tasks, setTasks] = useState<Task[]>([
		{
			id: "1",
			title: "Sample Task",
			description: "A sample task for demonstration",
			priority: "medium",
			status: "completed",
			createdAt: new Date(),
		},
	]);

	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newTask, setNewTask] = useState({
		title: "",
		description: "",
		priority: "medium" as const,
	});

	const createTask = () => {
		if (!newTask.title.trim()) return;

		const task: Task = {
			id: Date.now().toString(),
			title: newTask.title,
			description: newTask.description,
			priority: newTask.priority,
			status: "pending",
			createdAt: new Date(),
		};

		setTasks((prev) => [...prev, task]);
		setNewTask({ title: "", description: "", priority: "medium" });
		setShowCreateForm(false);
	};

	const updateTaskStatus = (taskId: string, status: Task["status"]) => {
		setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status } : task)));
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case "high":
				return "bg-red-100 text-red-800";
			case "medium":
				return "bg-yellow-100 text-yellow-800";
			case "low":
				return "bg-green-100 text-green-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "bg-green-100 text-green-800";
			case "in-progress":
				return "bg-blue-100 text-blue-800";
			case "blocked":
				return "bg-red-100 text-red-800";
			case "pending":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return <CheckCircle className="w-4 h-4" />;
			case "in-progress":
				return <Clock className="w-4 h-4" />;
			case "blocked":
				return <Square className="w-4 h-4" />;
			case "pending":
				return <Square className="w-4 h-4" />;
			default:
				return <Square className="w-4 h-4" />;
		}
	};

	return (
		<div className="container mx-auto py-8 space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Tasks</h1>
					<p className="text-gray-600 mt-2">Manage your project tasks and track progress</p>
				</div>
				<Button data-testid="create-task-button" onClick={() => setShowCreateForm(true)}>
					<Plus className="w-4 h-4 mr-2" />
					Create Task
				</Button>
			</div>

			{/* Create Task Form */}
			{showCreateForm && (
				<Card>
					<CardHeader>
						<CardTitle>Create New Task</CardTitle>
						<CardDescription>Add a new task to your project</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="task-title">Title</Label>
							<Input
								id="task-title"
								data-testid="task-title-input"
								value={newTask.title}
								onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
								placeholder="Enter task title"
							/>
						</div>
						<div>
							<Label htmlFor="task-description">Description</Label>
							<Textarea
								id="task-description"
								data-testid="task-description-input"
								value={newTask.description}
								onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
								placeholder="Enter task description"
							/>
						</div>
						<div>
							<Label htmlFor="task-priority">Priority</Label>
							<Select
								value={newTask.priority}
								onValueChange={(value: "low" | "medium" | "high") =>
									setNewTask((prev) => ({ ...prev, priority: value }))
								}
							>
								<SelectTrigger data-testid="task-priority-select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="low">Low</SelectItem>
									<SelectItem value="medium">Medium</SelectItem>
									<SelectItem value="high">High</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex space-x-2">
							<Button data-testid="create-task-submit" onClick={createTask}>
								Create Task
							</Button>
							<Button variant="outline" onClick={() => setShowCreateForm(false)}>
								Cancel
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Tasks List */}
			<div data-testid="task-list" className="space-y-4">
				{tasks.map((task) => (
					<Card key={task.id}>
						<CardContent className="pt-6">
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<div className="flex items-center space-x-3 mb-2">
										<h3 className="text-lg font-semibold">{task.title}</h3>
										<Badge
											data-testid="task-priority-badge"
											className={getPriorityColor(task.priority)}
										>
											{task.priority}
										</Badge>
										<Badge data-testid="task-status-badge" className={getStatusColor(task.status)}>
											<div className="flex items-center space-x-1">
												{getStatusIcon(task.status)}
												<span>{task.status}</span>
											</div>
										</Badge>
									</div>
									<p className="text-gray-600 mb-3">{task.description}</p>
									<div className="text-sm text-gray-500">
										Created: {task.createdAt.toLocaleDateString()}
									</div>
								</div>

								<DropdownMenu>
									<DropdownMenuTrigger asChild={true}>
										<Button data-testid="task-menu-button" variant="ghost" size="sm">
											<MoreHorizontal className="w-4 h-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										{task.status === "pending" && (
											<DropdownMenuItem
												data-testid="task-start-action"
												onClick={() => updateTaskStatus(task.id, "in-progress")}
											>
												<Play className="w-4 h-4 mr-2" />
												Start Task
											</DropdownMenuItem>
										)}
										{task.status === "in-progress" && (
											<DropdownMenuItem
												data-testid="task-complete-action"
												onClick={() => updateTaskStatus(task.id, "completed")}
											>
												<CheckCircle className="w-4 h-4 mr-2" />
												Complete Task
											</DropdownMenuItem>
										)}
										{task.status !== "blocked" && (
											<DropdownMenuItem
												data-testid="task-block-action"
												onClick={() => updateTaskStatus(task.id, "blocked")}
											>
												<Square className="w-4 h-4 mr-2" />
												Block Task
											</DropdownMenuItem>
										)}
										{task.status !== "pending" && (
											<DropdownMenuItem
												data-testid="task-reset-action"
												onClick={() => updateTaskStatus(task.id, "pending")}
											>
												<Square className="w-4 h-4 mr-2" />
												Reset to Pending
											</DropdownMenuItem>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</CardContent>
					</Card>
				))}

				{tasks.length === 0 && (
					<div className="text-center py-12">
						<Square className="mx-auto h-12 w-12 text-gray-400 mb-4" />
						<h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
						<p className="text-gray-500 mb-4">Get started by creating your first task.</p>
						<Button onClick={() => setShowCreateForm(true)}>
							<Plus className="w-4 h-4 mr-2" />
							Create Task
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
