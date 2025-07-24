"use client";

import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertSystem } from "./alert-system";
import { ProgressIndicator } from "./progress-indicator";
import { TaskProgressCard } from "./task-progress-card";

export interface TaskProgress {
	id: string;
	title: string;
	description?: string;
	status: "not-started" | "in-progress" | "completed" | "blocked" | "cancelled";
	progress: number; // 0-100
	priority: "low" | "medium" | "high" | "critical";
	assignee?: string;
	dueDate?: Date;
	createdAt: Date;
	updatedAt: Date;
	subtasks?: TaskProgress[];
	blockers?: string[];
	dependencies?: string[];
	estimatedHours?: number;
	actualHours?: number;
}

export interface ProjectStats {
	totalTasks: number;
	completedTasks: number;
	inProgressTasks: number;
	blockedTasks: number;
	overdueTasks: number;
	totalProgress: number;
	velocity: number; // tasks completed per week
	burndownData: Array<{
		date: Date;
		planned: number;
		actual: number;
	}>;
}

interface ProgressDashboardProps {
	tasks: TaskProgress[];
	projectStats: ProjectStats;
	onTaskUpdate?: (taskId: string, updates: Partial<TaskProgress>) => void;
	onAlertDismiss?: (alertId: string) => void;
	className?: string;
}

export function ProgressDashboard({
	tasks,
	projectStats,
	onTaskUpdate,
	onAlertDismiss,
	className = "",
}: ProgressDashboardProps) {
	const [alerts, setAlerts] = useState<
		Array<{
			id: string;
			type: "warning" | "error" | "info";
			title: string;
			message: string;
			taskId?: string;
			createdAt: Date;
		}>
	>([]);

	// Generate alerts based on task status
	useEffect(() => {
		const newAlerts: typeof alerts = [];

		// Check for overdue tasks
		const overdueTasks = tasks.filter(
			(task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed"
		);

		overdueTasks.forEach((task) => {
			newAlerts.push({
				id: `overdue-${task.id}`,
				type: "error",
				title: "Task Overdue",
				message: `"${task.title}" is overdue`,
				taskId: task.id,
				createdAt: new Date(),
			});
		});

		// Check for blocked tasks
		const blockedTasks = tasks.filter((task) => task.status === "blocked");
		blockedTasks.forEach((task) => {
			newAlerts.push({
				id: `blocked-${task.id}`,
				type: "warning",
				title: "Task Blocked",
				message: `"${task.title}" is blocked: ${task.blockers?.join(", ") || "Unknown reason"}`,
				taskId: task.id,
				createdAt: new Date(),
			});
		});

		// Check for tasks with no progress for 7+ days
		const stagnantTasks = tasks.filter((task) => {
			const daysSinceUpdate =
				(new Date().getTime() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
			return task.status === "in-progress" && daysSinceUpdate >= 7;
		});

		stagnantTasks.forEach((task) => {
			newAlerts.push({
				id: `stagnant-${task.id}`,
				type: "warning",
				title: "Stagnant Task",
				message: `"${task.title}" hasn't been updated in ${Math.floor((new Date().getTime() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24))} days`,
				taskId: task.id,
				createdAt: new Date(),
			});
		});

		setAlerts(newAlerts);
	}, [tasks]);

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return <CheckCircle className="h-5 w-5 text-green-500" />;
			case "in-progress":
				return <Activity className="h-5 w-5 text-blue-500" />;
			case "blocked":
				return <AlertTriangle className="h-5 w-5 text-red-500" />;
			default:
				return <Clock className="h-5 w-5 text-gray-500" />;
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "text-green-600 bg-green-50";
			case "in-progress":
				return "text-blue-600 bg-blue-50";
			case "blocked":
				return "text-red-600 bg-red-50";
			case "cancelled":
				return "text-gray-600 bg-gray-50";
			default:
				return "text-gray-600 bg-gray-50";
		}
	};

	const criticalTasks = tasks.filter(
		(task) => task.priority === "critical" && task.status !== "completed"
	);

	const highProgressTasks = tasks.filter(
		(task) => task.progress >= 80 && task.status !== "completed"
	);

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Alert System */}
			{alerts.length > 0 && (
				<AlertSystem
					alerts={alerts}
					onDismiss={(alertId) => {
						setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
						onAlertDismiss?.(alertId);
					}}
				/>
			)}

			{/* Overview Stats */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
						<Activity className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{projectStats.totalTasks}</div>
						<p className="text-xs text-muted-foreground">
							{projectStats.inProgressTasks} in progress
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Completed</CardTitle>
						<CheckCircle className="h-4 w-4 text-green-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{projectStats.completedTasks}</div>
						<p className="text-xs text-muted-foreground">
							{Math.round((projectStats.completedTasks / projectStats.totalTasks) * 100)}% complete
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Blocked</CardTitle>
						<AlertTriangle className="h-4 w-4 text-red-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">{projectStats.blockedTasks}</div>
						<p className="text-xs text-muted-foreground">Need attention</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Velocity</CardTitle>
						<TrendingUp className="h-4 w-4 text-blue-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-blue-600">{projectStats.velocity}</div>
						<p className="text-xs text-muted-foreground">tasks/week</p>
					</CardContent>
				</Card>
			</div>

			{/* Overall Progress */}
			<Card>
				<CardHeader>
					<CardTitle>Project Progress</CardTitle>
				</CardHeader>
				<CardContent>
					<ProgressIndicator
						progress={projectStats.totalProgress}
						label="Overall Completion"
						showPercentage
						size="lg"
					/>
				</CardContent>
			</Card>

			{/* Critical Tasks */}
			{criticalTasks.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-red-500" />
							Critical Tasks ({criticalTasks.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{criticalTasks.slice(0, 5).map((task) => (
								<TaskProgressCard key={task.id} task={task} onUpdate={onTaskUpdate} compact />
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Near Completion Tasks */}
			{highProgressTasks.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TrendingUp className="h-5 w-5 text-green-500" />
							Near Completion ({highProgressTasks.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{highProgressTasks.slice(0, 5).map((task) => (
								<TaskProgressCard key={task.id} task={task} onUpdate={onTaskUpdate} compact />
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* All Tasks */}
			<Card>
				<CardHeader>
					<CardTitle>All Tasks</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{tasks.map((task) => (
							<TaskProgressCard key={task.id} task={task} onUpdate={onTaskUpdate} />
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
