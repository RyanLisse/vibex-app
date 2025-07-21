"use client";

import { Activity, Clock, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
	ProgressMetrics,
	TaskProgress,
} from "@/src/schemas/enhanced-task-schemas";

interface ProgressDashboardProps {
	taskProgress: TaskProgress[];
	metrics?: ProgressMetrics[];
}

export function ProgressDashboard({
	taskProgress,
	metrics = [],
}: ProgressDashboardProps) {
	const totalTasks = taskProgress.length;
	const completedTasks = taskProgress.filter(
		(task) => task.progress === 100,
	).length;
	const inProgressTasks = taskProgress.filter(
		(task) => task.progress > 0 && task.progress < 100,
	).length;
	const notStartedTasks = taskProgress.filter(
		(task) => task.progress === 0,
	).length;

	const overallProgress =
		totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
	const averageProgress =
		totalTasks > 0
			? taskProgress.reduce((sum, task) => sum + task.progress, 0) / totalTasks
			: 0;

	return (
		<div className="space-y-6">
			{/* Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
						<div className="text-2xl font-bold text-green-600">
							{completedTasks}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">In Progress</CardTitle>
						<Clock className="h-4 w-4 text-blue-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-blue-600">
							{inProgressTasks}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Not Started</CardTitle>
						<Users className="h-4 w-4 text-gray-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-gray-600">
							{notStartedTasks}
						</div>
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

			{/* Recent Progress Updates */}
			{taskProgress.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Recent Updates</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{taskProgress.slice(0, 5).map((task) => (
								<div
									key={task.taskId}
									className="flex items-center justify-between"
								>
									<div className="flex-1">
										<div className="text-sm font-medium">
											Task {task.taskId}
										</div>
										{task.milestone && (
											<div className="text-xs text-gray-600">
												{task.milestone}
											</div>
										)}
									</div>
									<div className="flex items-center gap-2">
										<Progress value={task.progress} className="w-20 h-2" />
										<span className="text-sm font-medium w-12">
											{task.progress}%
										</span>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
