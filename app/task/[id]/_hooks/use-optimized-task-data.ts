import { useEffect, useMemo, useRef } from "react";
import type { StreamingMessage, Task } from "@/db/schema";
import { useUpdateTask } from "@/lib/query/hooks";
import {
	filterChatMessages,
	filterShellMessages,
	hasStreamingMessages,
	isTaskInProgress,
} from "../_utils/message-utils";

interface UseOptimizedTaskDataProps {
	task: Task | undefined;
	streamingMessages: Map<string, StreamingMessage>;
}

interface UseOptimizedTaskDataReturn {
	regularMessages: Task["messages"];
	shellMessages: Task["messages"];
	hasStreamingMessages: boolean;
	isTaskInProgress: boolean;
}

// Extract task tracking logic to a separate hook for better separation of concerns
function useTaskTracking(task: Task | undefined) {
	const updateTaskMutation = useUpdateTask();
	const previousTaskId = useRef<string | null>(null);
	const isFirstRender = useRef(true);

	useEffect(() => {
		const shouldUpdateTask = task && 
			(task.id !== previousTaskId.current || isFirstRender.current);

		if (shouldUpdateTask) {
			updateTaskMutation.mutate({
				id: task.id,
				hasChanges: false,
			});
			previousTaskId.current = task.id;
			isFirstRender.current = false;
		}
	}, [task, updateTaskMutation]);
}

// Extract message processing logic to simplify main hook
function useProcessedMessages(task: Task | undefined) {
	return useMemo(() => {
		const messages = task?.messages || [];
		return {
			regular: filterChatMessages(messages),
			shell: filterShellMessages(messages),
		};
	}, [task?.messages]);
}

// Extract state computations to reduce complexity
function useTaskState(task: Task | undefined, streamingMessages: Map<string, StreamingMessage>) {
	return useMemo(() => ({
		hasStreaming: hasStreamingMessages(streamingMessages),
		inProgress: task ? isTaskInProgress(task) : false,
	}), [task, streamingMessages]);
}

/**
 * Optimized task data hook with improved performance and reduced complexity
 * - Separated concerns into focused sub-hooks
 * - Reduced conditional logic and early returns
 * - Improved readability and maintainability
 */
export function useOptimizedTaskData({
	task,
	streamingMessages,
}: UseOptimizedTaskDataProps): UseOptimizedTaskDataReturn {
	// Use focused hooks for specific concerns
	useTaskTracking(task);
	const processedMessages = useProcessedMessages(task);
	const taskState = useTaskState(task, streamingMessages);

	// Single return statement with clear structure
	return {
		regularMessages: processedMessages.regular,
		shellMessages: processedMessages.shell,
		hasStreamingMessages: taskState.hasStreaming,
		isTaskInProgress: taskState.inProgress,
	};
}
