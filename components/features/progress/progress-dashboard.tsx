"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, Clock, TrendingUp, Users, AlertTriangle, Target, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProgressMetrics, TaskProgress } from "@/src/schemas/enhanced-task-schemas";

interface ProgressDashboardProps {
	taskProgress?: TaskProgress[];
	metrics?: ProgressMetrics[];
	enableRealTime?: boolean;
	refreshInterval?: number;
}

export function ProgressDashboard({
	taskProgress: initialTaskProgress = [],
	metrics = [],
	enableRealTime = true,
	refreshInterval = 5000,
}: ProgressDashboardProps) {
	const [taskProgress, setTaskProgress] = useState(initialTaskProgress);
	const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(enableRealTime);
	const [lastUpdate, setLastUpdate] = useState(new Date());

	// Mock real-time data if none provided
	useEffect(() => {
		if (taskProgress.length === 0) {
			setTaskProgress([
				{
					taskId: "1",
					progress: 75,
					milestone: "Authentication fixes",
					estimatedCompletionTime: 45,
					actualTimeSpent: 120,
					isBlocked: false,
					assignee: "John Doe",
					lastUpdated: new Date(Date.now() - 15 * 60 * 1000),
				},
				{
					taskId: "2",
					progress: 45,
					milestone: "Dark mode implementation",
					estimatedCompletionTime: 120,
					actualTimeSpent: 90,
					isBlocked: false,
					assignee: "Jane Smith",
					lastUpdated: new Date(Date.now() - 30 * 60 * 1000),
				},
				{
					taskId: "3",
					progress: 30,
					milestone: "Database optimization",
					estimatedCompletionTime: 0,
					actualTimeSpent: 180,
					isBlocked: true,
					assignee: "Bob Johnson",
					lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000),
				},
			]);
		}
	}, [taskProgress.length]);

	// Real-time updates simulation
	useEffect(() => {
		if (!isRealTimeEnabled) return;

		const interval = setInterval(() => {
			setTaskProgress((prev) =>
				prev.map((task) => {
					if (task.progress < 100 && !task.isBlocked) {
						// Simulate progress increment
						const increment = Math.random() * 3;
						const newProgress = Math.min(task.progress + increment, 100);
						const timeIncrement = Math.floor(Math.random() * 10) + 1;

						return {
							...task,
							progress: Math.round(newProgress * 10) / 10,
							actualTimeSpent: task.actualTimeSpent + timeIncrement,
							estimatedCompletionTime: Math.max(task.estimatedCompletionTime - timeIncrement, 0),
							lastUpdated: new Date(),
						};
					}
					return task;
				})
			);
			setLastUpdate(new Date());
		}, refreshInterval);

		return () => clearInterval(interval);
	}, [isRealTimeEnabled, refreshInterval]);

	const totalTasks = taskProgress.length;
	const completedTasks = taskProgress.filter((task) => task.progress === 100).length;
	const inProgressTasks = taskProgress.filter(
		(task) => task.progress > 0 && task.progress < 100
	).length;
	const notStartedTasks = taskProgress.filter((task) => task.progress === 0).length;
	const blockedTasks = taskProgress.filter((task) => task.isBlocked).length;

	const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
	const averageProgress =
		totalTasks > 0 ? taskProgress.reduce((sum, task) => sum + task.progress, 0) / totalTasks : 0;

	const formatTime = useCallback((minutes: number) => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
	}, []);

	const formatLastUpdated = useCallback((date: Date) => {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));

		if (diffMins < 1) return "Just now";
		if (diffMins < 60) return `${diffMins}m ago`;

		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;

		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays}d ago`;
	}, []);

	return (
		<div className="space-y-6">
			{/* Real-time Status Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-4">
					<h2 className="text-2xl font-bold">Progress Dashboard</h2>
					<Badge
						variant={isRealTimeEnabled ? "default" : "outline"}
						className="cursor-pointer"
						onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
					>
						{isRealTimeEnabled ? "🟢 Live" : "⏸️ Paused"}
					</Badge>
					<span className="text-sm text-gray-500">
						Last update: {formatLastUpdated(lastUpdate)}
					</span>
				</div>
				<Button variant="outline" size="sm" onClick={() => setLastUpdate(new Date())}>
					<RefreshCw className="h-4 w-4 mr-2" />
					Refresh
				</Button>
			</div>

			{/* Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
						<Activity className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalTasks}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Completed</CardTitle>
						<TrendingUp className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{completedTasks}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">In Progress</CardTitle>
						<Clock className="h-4 w-4 text-blue-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-blue-600">{inProgressTasks}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Not Started</CardTitle>
						<Users className="h-4 w-4 text-gray-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-gray-600">{notStartedTasks}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Blocked</CardTitle>
						<AlertTriangle className="h-4 w-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">{blockedTasks}</div>
					</CardContent>
				</Card>
			</div>

			{/* Progress Overview */}
			<Card>
				<CardHeader>
					<CardTitle>Overall Progress</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<div className="flex justify-between text-sm mb-2">
							<span>Completion Rate</span>
							<span>{overallProgress.toFixed(1)}%</span>
						</div>
						<Progress value={overallProgress} className="h-2" />
					</div>

					<div>
						<div className="flex justify-between text-sm mb-2">
							<span>Average Progress</span>
							<span>{averageProgress.toFixed(1)}%</span>
						</div>
						<Progress value={averageProgress} className="h-2" />
					</div>
				</CardContent>
			</Card>

			{/* Real-time Task Progress */}
			{taskProgress.length > 0 && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center space-x-2">
								<Activity className="h-5 w-5" />
								<span>Real-time Task Progress</span>
							</CardTitle>
							<Badge variant="outline" className="text-xs">
								{isRealTimeEnabled ? "Updating every 5s" : "Updates paused"}
							</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-6">
							{taskProgress.map((task) => (
								<div
									key={task.taskId}
									className={cn(
										"p-4 rounded-lg border transition-colors",
										task.isBlocked ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"
									)}
								>
									<div className="flex items-start justify-between mb-3">
										<div className="flex-1">
											<div className="flex items-center space-x-2 mb-1">
												<h4 className="font-medium">Task {task.taskId}</h4>
												{task.isBlocked && (
													<Badge variant="destructive" className="text-xs">
														Blocked
													</Badge>
												)}
												{task.progress === 100 && (
													<Badge variant="outline" className="text-xs bg-green-50 text-green-700">
														Completed
													</Badge>
												)}
											</div>
											{task.milestone && (
												<div className="text-sm text-gray-600 mb-2">{task.milestone}</div>
											)}
											<div className="flex items-center space-x-4 text-sm text-gray-600">
												{task.assignee && (
													<span className="flex items-center space-x-1">
														<Users className="h-4 w-4" />
														<span>{task.assignee}</span>
													</span>
												)}
												{task.lastUpdated && (
													<span>Updated: {formatLastUpdated(task.lastUpdated)}</span>
												)}
											</div>
										</div>
										<div className="text-right">
											<div className="text-lg font-bold">
												{Math.round(task.progress * 10) / 10}%
											</div>
											{task.actualTimeSpent && (
												<div className="text-sm text-gray-600">
													{formatTime(task.actualTimeSpent)} spent
												</div>
											)}
										</div>
									</div>

									<div className="space-y-2">
										<Progress
											value={task.progress}
											className={cn("h-2", task.isBlocked && "opacity-50")}
										/>
										<div className="flex justify-between text-sm text-gray-600">
											<span>Progress</span>
											{task.estimatedCompletionTime > 0 ? (
												<span>{formatTime(task.estimatedCompletionTime)} remaining</span>
											) : (
												<span>Time estimate needed</span>
											)}
										</div>
									</div>

									{task.isBlocked && (
										<div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-800">
											⚠️ Task is blocked - requires attention
										</div>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Team Performance Summary */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Target className="h-5 w-5" />
						<span>Team Performance</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="text-center">
							<div className="text-3xl font-bold text-blue-600">{inProgressTasks}</div>
							<div className="text-sm text-gray-600">Active Tasks</div>
							<Progress value={(inProgressTasks / totalTasks) * 100} className="mt-2 h-2" />
						</div>
						<div className="text-center">
							<div className="text-3xl font-bold text-green-600">
								{Math.round(averageProgress)}%
							</div>
							<div className="text-sm text-gray-600">Average Progress</div>
							<Progress value={averageProgress} className="mt-2 h-2" />
						</div>
						<div className="text-center">
							<div className="text-3xl font-bold text-purple-600">
								{totalTasks - completedTasks}
							</div>
							<div className="text-sm text-gray-600">Tasks Remaining</div>
							<Progress value={overallProgress} className="mt-2 h-2" />
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
