"use client";
import { Pause, Play, Square, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import {
	cancelTaskAction,
	pauseTaskAction,
	resumeTaskAction,
} from "@/app/actions/inngest";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskNavbarProps {
	taskId: string;
	taskTitle?: string;
	taskStatus?: "pending" | "running" | "completed" | "failed" | "cancelled";
	className?: string;
}

export default function TaskNavbar({
	taskId,
	taskTitle,
	taskStatus = "pending",
	className,
}: TaskNavbarProps) {
	const [isLoading, setIsLoading] = useState(false);

	const handlePause = useCallback(async () => {
		setIsLoading(true);
		try {
			await pauseTaskAction(taskId);
		} catch (error) {
			console.error("Failed to pause task:", error);
		} finally {
			setIsLoading(false);
		}
	}, [taskId]);

	const handleResume = useCallback(async () => {
		setIsLoading(true);
		try {
			await resumeTaskAction(taskId);
		} catch (error) {
			console.error("Failed to resume task:", error);
		} finally {
			setIsLoading(false);
		}
	}, [taskId]);

	const handleCancel = useCallback(async () => {
		setIsLoading(true);
		try {
			await cancelTaskAction(taskId);
		} catch (error) {
			console.error("Failed to cancel task:", error);
		} finally {
			setIsLoading(false);
		}
	}, [taskId]);

	const canPause = taskStatus === "running";
	const canResume = taskStatus === "pending";
	const canCancel = taskStatus === "running" || taskStatus === "pending";

	return (
		<nav
			className={cn(
				"flex items-center justify-between p-4 border-b bg-background",
				className,
			)}
		>
			<div className="flex items-center gap-4">
				<Link href="/tasks">
					<Button variant="ghost" size="sm">
						<X className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-lg font-semibold truncate">
						{taskTitle || `Task ${taskId}`}
					</h1>
					<p className="text-sm text-muted-foreground capitalize">
						{taskStatus}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				{canResume && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleResume}
						disabled={isLoading}
					>
						<Play className="h-4 w-4 mr-2" />
						Resume
					</Button>
				)}

				{canPause && (
					<Button
						variant="outline"
						size="sm"
						onClick={handlePause}
						disabled={isLoading}
					>
						<Pause className="h-4 w-4 mr-2" />
						Pause
					</Button>
				)}

				{canCancel && (
					<Button
						variant="destructive"
						size="sm"
						onClick={handleCancel}
						disabled={isLoading}
					>
						<Square className="h-4 w-4 mr-2" />
						Cancel
					</Button>
				)}
			</div>
		</nav>
	);
}
