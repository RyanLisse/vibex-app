"use client";

import { AlertTriangle, Calendar, CheckCircle, Clock, MoreHorizontal, User } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import type { TaskProgress } from "./progress-dashboard";
import { ProgressIndicator } from "./progress-indicator";

interface TaskProgressCardProps {
	task: TaskProgress;
	onUpdate?: (taskId: string, updates: Partial<TaskProgress>) => void;
	compact?: boolean;
	className?: string;
}

export function TaskProgressCard({
	task,
	onUpdate,
	compact = false,
	className = "",
}: TaskProgressCardProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case "in-progress":
				return <Clock className="h-4 w-4 text-blue-500" />;
			case "blocked":
				return <AlertTriangle className="h-4 w-4 text-red-500" />;
			default:
				return <Clock className="h-4 w-4 text-gray-500" />;
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
			case "cancelled":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case "critical":
				return "bg-red-500 text-white";
			case "high":
				return "bg-orange-500 text-white";
			case "medium":
				return "bg-yellow-500 text-white";
			case "low":
				return "bg-green-500 text-white";
			default:
				return "bg-gray-500 text-white";
		}
	};

	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		}).format(date);
	};

	const isOverdue =
		task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";
	const daysSinceUpdate = Math.floor(
		(new Date().getTime() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
	);

	const handleStatusChange = (newStatus: TaskProgress["status"]) => {
		const updates: Partial<TaskProgress> = {
			status: newStatus,
			updatedAt: new Date(),
		};

		if (newStatus === "completed") {
			updates.progress = 100;
		}

		onUpdate?.(task.id, updates);
	};

	const handleProgressUpdate = (newProgress: number) => {
		const updates: Partial<TaskProgress> = {
			progress: newProgress,
			updatedAt: new Date(),
		};

		if (newProgress === 100 && task.status !== "completed") {
			updates.status = "completed";
		} else if (newProgress > 0 && task.status === "not-started") {
			updates.status = "in-progress";
		}

		onUpdate?.(task.id, updates);
	};

	if (compact) {
		return (
			<Card className={`hover:shadow-md transition-shadow ${className}`}>
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3 flex-1 min-w-0">
							{getStatusIcon(task.status)}
							<div className="flex-1 min-w-0">
								<h4 className="font-medium text-sm truncate">{task.title}</h4>
								<div className="flex items-center gap-2 mt-1">
									<Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
										{task.priority}
									</Badge>
									{task.assignee && (
										<div className="flex items-center gap-1 text-xs text-gray-500">
											<User className="h-3 w-3" />
											<span className="truncate max-w-[80px]">{task.assignee}</span>
										</div>
									)}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<ProgressIndicator progress={task.progress} size="sm" showPercentage={false} />
							<span className="text-sm font-medium min-w-[40px] text-right">{task.progress}%</span>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={`hover:shadow-md transition-shadow ${className}`}>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex items-start gap-3 flex-1 min-w-0">
						{getStatusIcon(task.status)}
						<div className="flex-1 min-w-0">
							<h4 className="font-medium text-base leading-tight">{task.title}</h4>
							{task.description && (
								<p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
							)}
						</div>
					</div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild={true}>
							<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => handleStatusChange("in-progress")}>
								Mark In Progress
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleStatusChange("completed")}>
								Mark Completed
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleStatusChange("blocked")}>
								Mark Blocked
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
								{isExpanded ? "Collapse" : "Expand"} Details
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Progress */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Progress</span>
						<span className="text-sm font-medium">{task.progress}%</span>
					</div>
					<ProgressIndicator
						progress={task.progress}
						size="md"
						showPercentage={false}
						interactive={true}
						onProgressChange={handleProgressUpdate}
					/>
				</div>

				{/* Status and Priority */}
				<div className="flex items-center gap-2">
					<Badge className={`text-xs ${getStatusColor(task.status)}`}>
						{task.status.replace("-", " ")}
					</Badge>
					<Badge className={`text-xs ${getPriorityColor(task.priority)}`}>{task.priority}</Badge>
					{isOverdue && <Badge className="text-xs bg-red-100 text-red-800">Overdue</Badge>}
				</div>

				{/* Metadata */}
				<div className="flex items-center justify-between text-sm text-gray-600">
					<div className="flex items-center gap-4">
						{task.assignee && (
							<div className="flex items-center gap-1">
								<User className="h-4 w-4" />
								<span>{task.assignee}</span>
							</div>
						)}
						{task.dueDate && (
							<div className={`flex items-center gap-1 ${isOverdue ? "text-red-600" : ""}`}>
								<Calendar className="h-4 w-4" />
								<span>{formatDate(task.dueDate)}</span>
							</div>
						)}
					</div>
					<div className="text-xs text-gray-500">
						Updated {daysSinceUpdate === 0 ? "today" : `${daysSinceUpdate}d ago`}
					</div>
				</div>

				{/* Expanded Details */}
				{isExpanded && (
					<div className="space-y-3 pt-3 border-t">
						{task.blockers && task.blockers.length > 0 && (
							<div>
								<h5 className="text-sm font-medium text-red-600 mb-1">Blockers:</h5>
								<ul className="text-sm text-gray-600 space-y-1">
									{task.blockers.map((blocker, index) => (
										<li key={index} className="flex items-start gap-2">
											<AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
											{blocker}
										</li>
									))}
								</ul>
							</div>
						)}

						{task.dependencies && task.dependencies.length > 0 && (
							<div>
								<h5 className="text-sm font-medium mb-1">Dependencies:</h5>
								<div className="flex flex-wrap gap-1">
									{task.dependencies.map((dep, index) => (
										<Badge key={index} variant="outline" className="text-xs">
											{dep}
										</Badge>
									))}
								</div>
							</div>
						)}

						{(task.estimatedHours || task.actualHours) && (
							<div className="grid grid-cols-2 gap-4 text-sm">
								{task.estimatedHours && (
									<div>
										<span className="text-gray-500">Estimated:</span>
										<span className="ml-1 font-medium">{task.estimatedHours}h</span>
									</div>
								)}
								{task.actualHours && (
									<div>
										<span className="text-gray-500">Actual:</span>
										<span className="ml-1 font-medium">{task.actualHours}h</span>
									</div>
								)}
							</div>
						)}

						{task.subtasks && task.subtasks.length > 0 && (
							<div>
								<h5 className="text-sm font-medium mb-2">
									Subtasks ({task.subtasks.filter((st) => st.status === "completed").length}/
									{task.subtasks.length})
								</h5>
								<div className="space-y-2">
									{task.subtasks.slice(0, 3).map((subtask) => (
										<div key={subtask.id} className="flex items-center gap-2 text-sm">
											{getStatusIcon(subtask.status)}
											<span
												className={
													subtask.status === "completed" ? "line-through text-gray-500" : ""
												}
											>
												{subtask.title}
											</span>
										</div>
									))}
									{task.subtasks.length > 3 && (
										<div className="text-xs text-gray-500">
											+{task.subtasks.length - 3} more subtasks
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
