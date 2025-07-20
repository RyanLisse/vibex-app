"use client";
import type React from "react";
import { memo } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { TaskMessageProcessor } from "@/components/providers/task-message-processor";

interface ContainerProps {
	children: React.ReactNode;
}

/**
 * Container component that orchestrates real-time task management.
 * Uses provider pattern for better separation of concerns and testability.
 */
function Container({ children }: ContainerProps) {
	return (
		<ErrorBoundary>
			<RealtimeProvider>
				<TaskMessageProcessor>{children}</TaskMessageProcessor>
			</RealtimeProvider>
		</ErrorBoundary>
	);
}

export default memo(Container);
