/**
 * Enhanced Task List Component
 *
 * Uses TanStack Query for data fetching with real-time updates,
 * optimistic updates, and comprehensive error handling.
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import {
	AlertCircle,
	Archive,
	CheckCircle,
	Clock,
	Filter,
	Loader2,
	MoreVertical,
	Pause,
	Play,
	Plus,
	RefreshCw,
	Search,
	Square,
} from "lucide-react";
import React, { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Task } from "@/db/schema";
import {
	useCreateTask,
	useDeleteTask,
	useTasks,
	useTasksSubscription,
	useUpdateTask,
} from "@/lib/queries/hooks/use-tasks";
import { cn } from "@/lib/utils";

interface EnhancedTaskListProps {
	className?: string;
	onTaskClick?: (task: Task) => void;
	showCreateButton?: boolean;
	filters?: {
		status?: string;
		priority?: string;
		userId?: string;
	};
}

export function EnhancedTaskList({
	className,
	onTaskClick,
	showCreateButton = true,
	filters: initialFilters,
}: EnhancedTaskListProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [filters, setFilters] = useState(initialFilters || {});
	const [showCreateForm, setShowCreateForm] = useState(false);

	// Query hooks
	const { data: tasks = [], isLoading, error, refetch } = useTasks(filters);

	const createTaskMutation = useCreateTask();
	const updateTaskMutation = useUpdateTask();
	const deleteTaskMutation = useDeleteTask();

	// Real-time subscription
	useTasksSubscription(filters, (updatedTasks) => {
		console.log("Real-time task updates:", updatedTasks.length);
	});

	// Filter tasks by search query
	const filteredTasks = tasks.filter(
		(task) =>
			task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return <CheckCircle className="h-4 w-4 text-green-600" />;
			case "in-progress":
				return <Play className="h-4 w-4 text-blue-600" />;
			case "paused":
				return <Pause className="h-4 w-4 text-yellow-600" />;
			case "cancelled":
				return <Square className="h-4 w-4 text-red-600" />;
			default:
				return <Clock className="h-4 w-4 text-gray-600" />;
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "text-green-700 bg-green-50 border-green-200";
			case "in-progress":
				return "text-blue-700 bg-blue-50 border-blue-200";
			case "paused":
				return "text-yellow-700 bg-yellow-50 border-yellow-200";
			case "cancelled":
				return "text-red-700 bg-red-50 border-red-200";
			default:
				return "text-gray-700 bg-gray-50 border-gray-200";
		}
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case "high":
				return "text-red-600 bg-red-50";
			case "medium":
				return "text-yellow-600 bg-yellow-50";
			case "low":
				return "text-green-600 bg-green-50";
			default:
				return "text-gray-600 bg-gray-50";
		}
	};

	const handleCreateTask = async (taskData: {
		title: string;
		description?: string;
		priority?: string;
	}) => {
		try {
			await createTaskMutation.mutateAsync({
				title: taskData.title,
				description: taskData.description,
				priority: taskData.priority || "medium",
				status: "pending",
			});
			setShowCreateForm(false);
		} catch (error) {
			console.error("Failed to create task:", error);
		}
	};

	const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
		try {
			await updateTaskMutation.mutateAsync({ id, data: updates });
		} catch (error) {
			console.error("Failed to update task:", error);
		}
	};

	const handleDeleteTask = async (id: string) => {
		try {
			await deleteTaskMutation.mutateAsync(id);
		} catch (error) {
			console.error("Failed to delete task:", error);
		}
	};

	const handleStatusChange = (task: Task, newStatus: string) => {
		handleUpdateTask(task.id, { status: newStatus });
	};

	if (error) {
		return (
			<Card className={className}>
				<CardContent className="pt-6">
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							Failed to load tasks: {error.message}
							<Button variant="outline" size="sm" onClick={() => refetch()} className="ml-2">
								<RefreshCw className="h-4 w-4 mr-2" />
								Retry
							</Button>
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center space-x-2">
							<span>Tasks</span>
							{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
						</CardTitle>
						<CardDescription>
							{filteredTasks.length} of {tasks.length} tasks
						</CardDescription>
					</div>
					<div className="flex items-center space-x-2">
						<Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
							<RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
						</Button>
						{showCreateButton && (
							<Button
								size="sm"
								onClick={() => setShowCreateForm(true)}
								disabled={createTaskMutation.isPending}
							>
								<Plus className="h-4 w-4 mr-2" />
								{createTaskMutation.isPending ? "Creating..." : "New Task"}
							</Button>
						)}
					</div>
				</div>

				{/* Search and Filters */}
				<div className="flex items-center space-x-2">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<Input
							placeholder="Search tasks..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Select
						value={filters.status || "all"}
						onValueChange={(value) =>
							setFilters({ ...filters, status: value === "all" ? undefined : value })
						}
					>
						<SelectTrigger className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="in-progress">In Progress</SelectItem>
							<SelectItem value="completed">Completed</SelectItem>
							<SelectItem value="cancelled">Cancelled</SelectItem>
						</SelectContent>
					</Select>
					<Select
						value={filters.priority || "all"}
						onValueChange={(value) =>
							setFilters({ ...filters, priority: value === "all" ? undefined : value })
						}
					>
						<SelectTrigger className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Priority</SelectItem>
							<SelectItem value="high">High</SelectItem>
							<SelectItem value="medium">Medium</SelectItem>
							<SelectItem value="low">Low</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</CardHeader>

			<CardContent>
				{isLoading && tasks.length === 0 ? (
					<div className="flex items-center justify-center h-32">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
					</div>
				) : filteredTasks.length === 0 ? (
					<div className="text-center py-8 text-gray-500">
						{searchQuery ? "No tasks match your search" : "No tasks found"}
					</div>
				) : (
					<ScrollArea className="h-96">
						<div className="space-y-3">
							{filteredTasks.map((task) => (
								<div
									key={task.id}
									className={cn(
										"p-4 border rounded-lg transition-all duration-200",
										"hover:shadow-md hover:border-gray-300",
										onTaskClick && "cursor-pointer",
										getStatusColor(task.status)
									)}
									onClick={() => onTaskClick?.(task)}
								>
									<div className="flex items-start justify-between">
										<div className="flex-1 min-w-0">
											<div className="flex items-center space-x-2 mb-2">
												{getStatusIcon(task.status)}
												<h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
												<Badge
													variant="secondary"
													className={cn("text-xs", getPriorityColor(task.priority || "medium"))}
												>
													{task.priority || "medium"}
												</Badge>
											</div>

											{task.description && (
												<p className="text-sm text-gray-600 line-clamp-2 mb-2">
													{task.description}
												</p>
											)}

											<div className="flex items-center space-x-4 text-xs text-gray-500">
												<span>Created {formatDistanceToNow(task.createdAt)} ago</span>
												<span>Updated {formatDistanceToNow(task.updatedAt)} ago</span>
											</div>
										</div>

										<DropdownMenu>
											<DropdownMenuTrigger asChild={true}>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0"
													onClick={(e) => e.stopPropagation()}
												>
													<MoreVertical className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												{task.status === "pending" && (
													<DropdownMenuItem
														onClick={(e) => {
															e.stopPropagation();
															handleStatusChange(task, "in-progress");
														}}
													>
														<Play className="h-4 w-4 mr-2" />
														Start
													</DropdownMenuItem>
												)}
												{task.status === "in-progress" && (
													<>
														<DropdownMenuItem
															onClick={(e) => {
																e.stopPropagation();
																handleStatusChange(task, "paused");
															}}
														>
															<Pause className="h-4 w-4 mr-2" />
															Pause
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={(e) => {
																e.stopPropagation();
																handleStatusChange(task, "completed");
															}}
														>
															<CheckCircle className="h-4 w-4 mr-2" />
															Complete
														</DropdownMenuItem>
													</>
												)}
												{task.status === "paused" && (
													<DropdownMenuItem
														onClick={(e) => {
															e.stopPropagation();
															handleStatusChange(task, "in-progress");
														}}
													>
														<Play className="h-4 w-4 mr-2" />
														Resume
													</DropdownMenuItem>
												)}
												<Separator />
												<DropdownMenuItem
													onClick={(e) => {
														e.stopPropagation();
														handleStatusChange(task, "cancelled");
													}}
													className="text-red-600"
												>
													<Square className="h-4 w-4 mr-2" />
													Cancel
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteTask(task.id);
													}}
													className="text-red-600"
												>
													<Archive className="h-4 w-4 mr-2" />
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							))}
						</div>
					</ScrollArea>
				)}
			</CardContent>

			{/* Loading states for mutations */}
			{(updateTaskMutation.isPending || deleteTaskMutation.isPending) && (
				<div className="absolute inset-0 bg-white/50 flex items-center justify-center">
					<Loader2 className="h-6 w-6 animate-spin" />
				</div>
			)}
		</Card>
	);
}
