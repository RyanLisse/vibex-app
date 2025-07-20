"use client";

import { TaskErrorFallback } from "@/app/task/[id]/_components/task-error-fallback";
import { TaskLayout } from "@/app/task/[id]/_components/task-layout";
import { TaskProvider } from "@/app/task/[id]/_providers/task-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import TaskNavbar from "@/components/navigation/task-navbar";

interface TaskClientPageProps {
	id: string;
}

/**
 * Refactored TaskClientPage with improved architecture:
 * - Separated concerns with providers and layout components
 * - Added error boundaries for better error handling
 * - Simplified main component to focus on composition
 * - Improved performance with optimized re-render patterns
 */
export default function TaskClientPage({ id }: TaskClientPageProps) {
	return (
		<ErrorBoundary fallback={<TaskErrorFallback />}>
			<div className="flex h-screen flex-col">
				<TaskNavbar id={id} />
				<TaskProvider taskId={id}>
					<TaskLayout />
				</TaskProvider>
			</div>
		</ErrorBoundary>
	);
}
